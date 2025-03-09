import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login/Login';
import WAFLayout from './pages/WAF/WAFLayout/WAFLayout';
import DurumPaneli from './pages/WAF/DurumPaneli/DurumPaneli';
import Sistem from './pages/WAF/Sistem/Sistem';
import Loglar from './pages/WAF/Loglar/Loglar';
import IDS from './pages/WAF/IDS/IDS';

import './index.css'
import { getCookieJSON } from './utils/cookie';

function App() {
  const isAuthenticated = () => {
    const user = getCookieJSON("user");
    return user !== null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated() ? <Navigate to="/waf/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/waf" element={isAuthenticated() ? <WAFLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/waf/dashboard" replace />} />
          <Route path="dashboard" element={<DurumPaneli />} />
          <Route path="system" element={<Sistem />} />
          <Route path="logs" element={<Loglar />} />
          <Route path="ids" element={<IDS />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App;
