import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login/Login';
import WAFLayout from './pages/WAF/WAFLayout/WAFLayout';
import WAF from './pages/WAF/WAF'; // Ana sistem sağlığı sayfası
import WAFTests from './pages/WAF/WAFTests'; // Test sayfası

import './index.css'
import { getCookieJSON } from './utils/cookie';
import SystemHealth from './pages/WAF/SystemHealth';

function App() {
  const isAuthenticated = () => {
    const user = getCookieJSON("user");
    return user !== null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated() ? <Navigate to="/waf/system-health" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        
        {/* WAF Layout ile içinde farklı sayfalar gösteriyoruz */}
        <Route path="/waf" element={isAuthenticated() ? <WAFLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/waf/system-health" />} />
          <Route path="system-health" element={<SystemHealth />} />
          <Route path="tests" element={<WAFTests />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
