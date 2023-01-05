import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Link, Route, useHistory, useParams } from 'react-router-dom';
import LogsDetailPage from './pages/logs-detail-page';
import LogsPage from './pages/logs-page';
import '@patternfly/patternfly/patternfly.css';
import LogsDevPage from './pages/logs-dev-page';
import './index.css';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core';

const DevConsole = () => {
  const { ns: namespace } = useParams<{ ns: string }>();
  const history = useHistory();
  const [isOpen, setIsOpen] = React.useState(false);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const onSelectNamespace = (namespace: string) => () => {
    history.push(`/dev-monitoring/ns/${namespace}/logs`);
    setIsOpen(false);
  };

  return (
    <>
      <Dropdown
        data-test="namespace-dropdown"
        toggle={
          <DropdownToggle id="toggle-basic" onToggle={onToggle} data-test="namespace-toggle">
            {namespace}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={[
          <DropdownItem onClick={onSelectNamespace('default')} key="default" component="button">
            default
          </DropdownItem>,
          <DropdownItem
            onClick={onSelectNamespace('my-namespace')}
            key="my-namespace"
            component="button"
          >
            my-namespace
          </DropdownItem>,
          <DropdownItem
            onClick={onSelectNamespace('my-namespace-two')}
            key="my-namespace-two"
            component="button"
          >
            my-namespace-two
          </DropdownItem>,
          <DropdownItem
            onClick={onSelectNamespace('openshift-cluster-version')}
            key="action"
            component="button"
          >
            openshift-cluster-version
          </DropdownItem>,
        ]}
      />
      <LogsDevPage />
    </>
  );
};

const EndToEndTestsApp = () => {
  return (
    <div className="pf-c-page co-logs-standalone__page">
      <BrowserRouter>
        <header className="pf-c-masthead">
          <div className="pf-c-masthead__main"></div>
        </header>

        <div className="pf-c-page__sidebar co-logs-standalone__side-menu">
          <div className="pf-c-page__sidebar-body">
            <nav className="pf-c-nav" aria-label="Global">
              <ul className="pf-c-nav__list">
                <li className="pf-c-nav__item">
                  <Link className="pf-c-nav__link" to="/k8s/ns/default/pods/test-pod-name">
                    Pods Logs
                  </Link>
                </li>
                <li className="pf-c-nav__item">
                  <Link className="pf-c-nav__link" to="/dev-monitoring/ns/my-namespace/logs">
                    Dev Logs
                  </Link>
                </li>
                <li className="pf-c-nav__item">
                  <Link className="pf-c-nav__link" to="/monitoring/logs">
                    Logs
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <main className="pf-c-page__main" tabIndex={-1}>
          <Route path="/monitoring/logs">
            <LogsPage />
          </Route>
          <Route path="/dev-monitoring/ns/:ns/logs">
            <DevConsole />
          </Route>
          <Route path="/k8s/ns/:ns/pods/:name">
            <LogsDetailPage />
          </Route>
        </main>
      </BrowserRouter>
    </div>
  );
};

ReactDOM.render(<EndToEndTestsApp />, document.getElementById('app'));
