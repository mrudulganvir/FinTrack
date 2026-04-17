import json
import logging
from typing import Any, Dict
from aiokafka import AIOKafkaProducer
from os import getenv

log = logging.getLogger(__name__)

class QueueService:
    """
    Service to handle Message Queue operations using aiokafka.
    """
    
    def __init__(self):
        # Configuration from environment variables
        self.bootstrap_servers = getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        self.queue_name = "raw_transactions_queue"
        self.producer = None

    async def start(self):
        """
        Initialize and start the Kafka producer.
        Call this during FastAPI startup (lifespan).
        """
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await self.producer.start()
        log.info("Kafka Producer started successfully.")

    async def stop(self):
        """
        Stop the Kafka producer.
        Call this during FastAPI shutdown.
        """
        if self.producer:
            await self.producer.stop()
            log.info("Kafka Producer stopped.")

    async def push_to_queue(self, payload: Dict[str, Any]):
        """
        Pushes raw transaction data to the real Kafka topic.
        """
        if not self.producer:
            log.error("Producer not initialized. Did you call .start()?")
            return

        try:
            # We use send_and_wait to ensure delivery for critical financial data
            await self.producer.send_and_wait(self.queue_name, payload)
            log.info(f"Successfully pushed transaction to Kafka: {payload.get('description', 'Unknown')}")
            
        except Exception as e:
            log.error(f"Failed to push to Kafka: {e}")

    # Note: _simulate_consumer_processing is removed here.
    # In Kafka, the Consumer would be a separate Python script or service.

queue_service = QueueService()