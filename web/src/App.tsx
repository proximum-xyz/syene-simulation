import React from 'react';
import { BrowserRouter as Router, Route, Routes, Outlet } from 'react-router-dom';
import { PATHS } from './types';
import SimulationView from './simulation/SimulationView';
import WelcomeModal from './WelcomeModal';

const App = () => {
  return (
    <Router>

      <Routes>
        <Route path={PATHS.home} element={<Outlet />}>
          <Route index element={<WelcomeModal />} />
          <Route path={PATHS.simulation} element={
            <SimulationView />
          } />
        </Route>
      </Routes >
    </Router>
  );
};

export default App;