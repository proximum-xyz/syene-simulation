import React from 'react';
import Map from './Map';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<Map />} />
      </Routes>
    </Router>
  );
};

export default App;