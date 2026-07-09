import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from './api';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Zerodha redirects the BROWSER here after login, e.g.:
 *   /zerodha/callback?request_token=abc123&status=success
 * This page grabs request_token from the URL and exchanges it via our
 * authenticated backend endpoint (JWT already in localStorage via api.js).
 */
const ZerodhaCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('connecting'); // 'connecting' | 'success' | 'error'
    const [message, setMessage] = useState('Connecting your Zerodha account...');

    useEffect(() => {
        const requestToken = searchParams.get('request_token');
        const kiteStatus = searchParams.get('status');

        if (kiteStatus !== 'success' || !requestToken) {
            setStatus('error');
            setMessage('Zerodha login did not complete. Please try connecting again.');
            return;
        }

        api.post('/zerodha/connect', { request_token: requestToken })
            .then(() => {
                setStatus('success');
                setMessage('Zerodha connected! Redirecting...');
                setTimeout(() => navigate('/investments'), 1500);
            })
            .catch((error) => {
                setStatus('error');
                setMessage(error.response?.data?.detail || 'Failed to connect your Zerodha account.');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="h-screen bg-dark flex items-center justify-center px-4">
            <div className="glass p-10 rounded-[2rem] max-w-md w-full text-center space-y-4">
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {status === 'error' ? <AlertTriangle size={28} /> : <ShieldCheck size={28} className={status === 'connecting' ? 'animate-pulse' : ''} />}
                </div>
                <p className="text-white font-bold">{message}</p>
                {status === 'error' && (
                    <button onClick={() => navigate('/investments')}
                        className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-2xl font-bold transition-all">
                        Back to Investments
                    </button>
                )}
            </div>
        </div>
    );
};

export default ZerodhaCallback;