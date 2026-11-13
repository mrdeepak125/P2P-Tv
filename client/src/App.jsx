import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { RoomProvider } from './context/RoomContext';
import { Home } from './pages/Home';
import { TVDisplay } from './pages/TVDisplay';
import { RoomDashboard } from './pages/RoomDashboard';
import { JoinRoom } from './pages/JoinRoom';
import { CreateRoom } from './pages/CreateRoom';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <RoomProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tv" element={<TVDisplay />} />
            <Route path="/tv/:code" element={<TVDisplay />} />
            <Route path="/join" element={<JoinRoom />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/room/:code" element={<RoomDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RoomProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

