import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import App from './App';import {AuthProvider} from './lib/auth';import './index.css';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter></QueryClientProvider>);
