import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Link, Route } from 'react-router-dom';
import LogsDetailPage from './pages/logs-detail-page';
import LogsPage from './pages/logs-page';
import '@patternfly/patternfly/patternfly.css';

const App = () => {
  return (
    <div className="pf-c-page" style={{ height: '100vh' }}>
      <BrowserRouter>
        <header className="pf-c-masthead">
          <div className="pf-c-masthead__main"></div>
        </header>

        <div className="pf-c-page__sidebar">
          <div className="pf-c-page__sidebar-body">
            <nav className="pf-c-nav" aria-label="Global">
              <ul className="pf-c-nav__list">
                <li className="pf-c-nav__item">
                  <Link
                    className="pf-c-nav__link"
                    to="/k8s/ns/default/pods/test-pod-name"
                  >
                    Pods Logs
                  </Link>
                </li>
                <li className="pf-c-nav__item">
                  <a href="#" aria-current="page">
                    <Link className="pf-c-nav__link" to="/monitoring/logs">
                      Logs
                    </Link>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <main className="pf-c-page__main" tabIndex={-1}>
          <Route path="/monitoring/logs">
            <LogsPage />
          </Route>
          <Route path="/k8s/ns/:namespace/pods/:name">
            <LogsDetailPage />
          </Route>
        </main>
      </BrowserRouter>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
