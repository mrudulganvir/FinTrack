import asyncio
import json
import logging
from sqlalchemy.orm import Session
from app.database.db import SessionLocal
from app.database.models import Transaction, LinkedAccount
from aiokafka import AIOKafkaConsumer
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transaction_worker")

async def consume_transactions():
    """
    Background worker that consumes transactions from Kafka and updates the database.
    This ensures that transactions automatically reflect in the user's dashboard
    without manual entry.
    """
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    topic = "raw_transactions_queue"

    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=bootstrap_servers,
        group_id="transaction_group",
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )

    await consumer.start()
    logger.info("Transaction Consumer Service started. Ready for automatic sync.")

    try:
        async for msg in consumer:
            tx_data = msg.value
            logger.info(f"Processing transaction: {tx_data.get('description')}")

            db: Session = SessionLocal()
            try:
                # 1. Create Transaction record
                new_tx = Transaction(
                    user_id=tx_data['user_id'],
                    amount=tx_data['amount'],
                    type=tx_data['type'],
                    category=tx_data.get('category', 'General'),
                    description=tx_data.get('description', ''),
                )
                db.add(new_tx)

                # 2. Automatically update LinkedAccount balance
                # Assuming the payload contains source_account_id
                if 'account_id' in tx_data:
                    account = db.query(LinkedAccount).filter(
                        LinkedAccount.account_id == tx_data['account_id']
                    ).first()
                    
                    if account:
                        if tx_data['type'] == 'expense':
                            account.balance -= tx_data['amount']
                        else:
                            account.balance += tx_data['amount']
                        
                        logger.info(f"Updated balance for account {account.account_id}: New Balance = {account.balance}")

                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to process transaction: {e}")
            finally:
                db.close()

    finally:
        await consumer.stop()

if __name__ == "__main__":
    asyncio.run(consume_transactions())
