import React, { useState } from 'react';
import './OpenAITest.css';

const OpenAITest = () => {
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const testOpenAI = async () => {
        setTesting(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch('/api/ai/test-connection');
            const data = await response.json();

            if (data.success) {
                setResult(data);
            } else {
                setError(data);
            }
        } catch (err) {
            setError({
                error: 'Network error',
                debug: err.message
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="openai-test">
            <div className="test-header">
                <h2>🤖 OpenAI Connection Test</h2>
                <p>Test if OpenAI API is working properly</p>
            </div>

            <button 
                className={`test-button ${testing ? 'testing' : ''}`}
                onClick={testOpenAI}
                disabled={testing}
            >
                {testing ? 'Testing...' : 'Test OpenAI Connection'}
            </button>

            {result && (
                <div className="result success">
                    <h3>✅ Success!</h3>
                    <div className="result-details">
                        <p><strong>AI Response:</strong> {result.message}</p>
                        <p><strong>Status:</strong> {result.test_status}</p>
                        <p><strong>Model:</strong> {result.model_used}</p>
                        <p><strong>API Key Length:</strong> {result.api_key_length} characters</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="result error">
                    <h3>❌ Error</h3>
                    <div className="result-details">
                        <p><strong>Error:</strong> {error.error}</p>
                        {error.debug && <p><strong>Debug:</strong> {error.debug}</p>}
                        {error.response && <p><strong>API Response:</strong> {error.response}</p>}
                    </div>
                </div>
            )}

            <div className="test-info">
                <h4>What this test does:</h4>
                <ul>
                    <li>Checks if OpenAI API key is configured</li>
                    <li>Makes a direct API call to OpenAI (bypassing library issues)</li>
                    <li>Tests basic AI text generation</li>
                    <li>Shows detailed error information if something fails</li>
                </ul>
            </div>
        </div>
    );
};

export default OpenAITest; 