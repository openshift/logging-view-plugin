import '@patternfly/patternfly/patternfly.css';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom-v5-compat';
import LogsAlertMetrics from './components/alerts/logs-alerts-metrics';
import i18n from './i18n';
import './index.css';
import LogsDetailPage from './pages/logs-detail-page';
import LogsDevPage from './pages/logs-dev-page';
import LogsPage from './pages/logs-page';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { TestIds } from './test-ids';

const DevConsole = () => {
  const { ns: namespace } = useParams<{ ns: string }>();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const onSelectNamespace = (selectedNamespace: string) => () => {
    navigate(`/dev-monitoring/ns/${selectedNamespace}/logs`);
    setIsOpen(false);
  };

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setIsOpen(false)}
        onOpenChange={(isOpenVal: boolean) => setIsOpen(isOpenVal)}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={onToggle}
            isExpanded={isOpen}
            id="toggle-basic"
            data-test={TestIds.NamespaceToggle}
          >
            {namespace}
          </MenuToggle>
        )}
      >
        <DropdownList data-test={TestIds.NamespaceDropdown}>
          <DropdownItem onClick={onSelectNamespace('default')} key="default" component="button">
            default
          </DropdownItem>
          <DropdownItem
            onClick={onSelectNamespace('my-namespace')}
            key="my-namespace"
            component="button"
          >
            my-namespace
          </DropdownItem>
          <DropdownItem
            onClick={onSelectNamespace('my-namespace-two')}
            key="my-namespace-two"
            component="button"
          >
            my-namespace-two
          </DropdownItem>
          <DropdownItem
            onClick={onSelectNamespace('openshift-cluster-version')}
            key="action"
            component="button"
          >
            openshift-cluster-version
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <LogsDevPage />
    </>
  );
};

const EndToEndTestsApp = () => {
  return (
    <div className="pf-v5-c-page lv-plugin__standalone__page">
      <BrowserRouter>
        <header className="pf-v5-c-masthead">
          <div className="pf-v5-c-masthead__main"></div>
        </header>

        <div className="pf-v5-c-page__sidebar lv-plugin__standalone__side-menu">
          <div className="pf-v5-c-page__sidebar-body">
            <nav className="pf-v5-c-nav" aria-label="Global">
              <ul className="pf-v5-c-nav__list">
                <li className="pf-v5-c-nav__item">
                  <Link className="pf-v5-c-nav__link" to="/k8s/ns/default/pods/test-pod-name">
                    Pods Logs
                  </Link>
                </li>
                <li className="pf-v5-c-nav__item">
                  <Link className="pf-v5-c-nav__link" to="/dev-monitoring/ns/my-namespace/logs">
                    Dev Logs
                  </Link>
                </li>
                <li className="pf-v5-c-nav__item">
                  <Link className="pf-v5-c-nav__link" to="/monitoring/logs">
                    Logs
                  </Link>
                </li>
                <li className="pf-v5-c-nav__item">
                  <Link className="pf-v5-c-nav__link" to="/monitoring/alerts/test-alert">
                    Alerts
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <main className="pf-v5-c-page__main" tabIndex={-1}>
          <Routes>
            <Route path="/monitoring/logs" element={<LogsPage />} />
            <Route path="/dev-monitoring/ns/:ns/logs" element={<DevConsole />} />
            <Route path="/k8s/ns/:ns/pods/:name" element={<LogsDetailPage />} />
            <Route
              path="/monitoring/alerts/:alertname"
              element={
                <LogsAlertMetrics
                  rule={{
                    labels: { tenantId: 'application' },
                    query: `sum by(job)(rate({ job=~".+" }[5m])) > 0`,
                  }}
                />
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
};

i18n.on('initialized', () => {
  ReactDOM.render(<EndToEndTestsApp />, document.getElementById('app'));
});
