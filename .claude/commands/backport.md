---
allowed-tools: Bash(git:*), Read, Write, Edit
argument-hint: <target-branch> [commit-hash]
description: Backport a feature or fix to a release branch with dependency adaptation
---

# Backport Feature to Release Branch

## Context

- Current branch: !`git branch --show-current`
- Target branch: $1
- Commit to backport: $2 (or HEAD if not specified)
- Latest commit info: !`git log -1 --format="%H %s"`
- Changed files: !`git show --name-only HEAD | tail -n +7`

## Dependency Version Differences

| Dependency   | Main (Latest) | release-coo-ocp-4.22 | release-coo-ocp-4.15 | release-coo-ocp-4.12 |
| ------------ | ------------- | -------------------- | -------------------- | -------------------- |
| PatternFly   | v6.x          | v6.x                 | v5.x                 | v4.x                 |
| React Router | v7.x          | v7.x                 | v6 compat            | v5                   |
| Console SDK  | 4.22+         | 4.22+                | 4.19                 | 1.6.0                |

## PatternFly v6 → v5 Transformations

```typescript
// v6 Dropdown (main)
import { Dropdown, DropdownItem, MenuToggle } from "@patternfly/react-core";

<Dropdown
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  toggle={(toggleRef) => (
    <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)}>
      {selected}
    </MenuToggle>
  )}
>
  <DropdownItem>Option 1</DropdownItem>
</Dropdown>;

// v5 Dropdown (release branches)
import { Dropdown, DropdownItem, DropdownToggle } from "@patternfly/react-core";

<Dropdown
  isOpen={isOpen}
  onSelect={() => setIsOpen(false)}
  toggle={<DropdownToggle onToggle={setIsOpen}>{selected}</DropdownToggle>}
  dropdownItems={[<DropdownItem key="1">Option 1</DropdownItem>]}
/>;
```

Common v6 → v5 changes:
| v6 (main) | v5 (release) | Notes |
| ---------------------- | ------------------- | ---------------------------- |
| `<Panel>` | `<Card>` | Different wrapper components |
| `MenuToggle` | `DropdownToggle` | Dropdown API changed |
| `Dropdown` (new API) | `Dropdown` (legacy) | Props differ significantly |
| `Select` (typeahead) | `Select` (legacy) | Selection handling differs |
| `onOpenChange` | `onToggle` | Event handler naming |

## React Router v7 → v6 → v5 Transformations

```typescript
// v7 Navigation (main, release-coo-ocp-4.22)
import { useNavigate, useLocation, useSearchParams } from "react-router";

const navigate = useNavigate();
navigate("/logs");

const [searchParams, setSearchParams] = useSearchParams();
const filter = searchParams.get("filter");

// v6 Navigation (release-coo-ocp-4.15)
import {
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom-v5-compat";

const navigate = useNavigate();
navigate("/logs");

const [searchParams, setSearchParams] = useSearchParams();
const filter = searchParams.get("filter");

// v5 Navigation (release-coo-ocp-4.12)
import { useHistory, useLocation } from "react-router-dom";

const history = useHistory();
history.push("/logs");

const location = useLocation();
const params = new URLSearchParams(location.search);
const filter = params.get("filter");
```

Common v7/v6 → v5 changes:
| v7/v6 (main/release-coo-ocp-4.22/release-coo-ocp-4.15)    | v5 (release-coo-ocp-4.12)  | Notes           |
| --------------------------------------------------------- | -------------------------- | --------------- |
| `useNavigate()`                                           | `useHistory()`             | Navigation hook |
| `navigate('/path')`                                       | `history.push('/path')`    | Navigation call |
| `useParams<Type>()`                                       | `useParams()` + casting    | Type handling   |
| `<Routes>`                                                | `<Switch>`                 | Route wrapper   |
| `<Route element={}>`                                      | `<Route component={}>`     | Route rendering |
| `useSearchParams()`                                       | `useLocation()` + parse    | Query params    |

## Your Task

Backport the specified commit to the target branch `$1`. Follow these steps:

### 1. Analyze the Commit

- Identify all changed files from the commit
- Categorize by type (components, hooks, translations, backend, etc.)
- Note any PatternFly, React Router, or Console SDK usage

### 2. Check Target Branch Dependencies

Run this command to compare versions:

```bash
git show $1:web/package.json | grep -E '@patternfly/react-core|react-router|@openshift/dynamic-plugin-sdk'
```

### 3. Identify Required Transformations

Based on the dependency differences table above:

- PatternFly v6 → v5 transformations (if targeting release-coo-ocp-4.15)
- PatternFly v6 → v4 transformations (if targeting release-coo-ocp-4.12)
- React Router v7 → v6 compat (if targeting release-coo-ocp-4.15)
- React Router v7 → v5 transformations (if targeting release-coo-ocp-4.12)

### 4. Create Backport Branch and Apply Changes

```bash
git checkout $1
git checkout -b backport-<feature>-to-$1
```

### 5. Reinstall Dependencies

After switching branches, always reinstall:

```bash
cd web && rm -rf node_modules && npm install
```

### 6. Apply the Backport

Either cherry-pick (if clean) or manually apply with transformations:

```bash
# Clean cherry-pick
git cherry-pick <commit-hash>

# Or with conflicts - resolve manually then:
git cherry-pick --continue

# Abort if needed
git cherry-pick --abort
```

### 7. Verify

Run these commands to validate:

```bash
cd web
npm run lint
npm run lint:tsc
npm run test:unit
cd .. && make test-translations
make test-backend
```

### 8. Report Summary

Provide a summary of:

- Files modified
- Transformations applied (PF v6→v5, Router v6→v5, path changes)
- Any issues encountered
- Commands to push and create PR:

```bash
git push origin backport-<feature>-to-$1
# Then create PR targeting $1 branch
```

## File Categorization by Complexity

| Category       | Path Pattern             | Backport Complexity                |
| -------------- | ------------------------ | ---------------------------------- |
| Components     | `web/src/components/**`  | Medium-High (dependency sensitive) |
| Pages          | `web/src/pages/**`       | Medium-High (console SDK)          |
| Hooks          | `web/src/hooks/**`       | Medium                             |
| Utils          | `web/src/utils/**`       | Low-Medium                         |
| Translations   | `web/locales/**`         | Low                                |
| Backend (Go)   | `pkg/**`, `cmd/**`       | Low-Medium                         |
| Cypress Tests  | `web/cypress/**`         | Medium                             |
| Config         | `web/*.json`, `Makefile` | High (version specific)            |
| Console Plugin | `console-extensions.json` | High (SDK version specific)       |

## Release Branch Types

| Branch Pattern         | Target Platform                   | Notes            |
| ---------------------- | --------------------------------- | ---------------- |
| `release-coo-ocp-4.22` | Cluster Obeservability Operator   | PatternFly v6    |
| `release-coo-ocp-4.15` | Cluster Obeservability Operator   | PatternFly v5    |
| `release-coo-ocp-4.12` | Cluster Obeservability Operator   | PatternFly v4    |

## Common Backport Scenarios

### Simple Bug Fix

- Usually clean cherry-pick
- No dependency changes
- Just run tests

### New Component Feature

- Check for PatternFly component usage
- Verify console-extensions.json compatibility
- May need v6→v5 or v6→v4 PatternFly transformations

### LogQL/Query Changes

- Check @grafana/lezer-logql compatibility
- Verify query parsing behavior
- Test with different log sources

### Log Viewer/Streaming Changes

- Check console SDK streaming APIs
- Verify WebSocket compatibility
- Test log volume handling

### Alerting Rules Integration

- Check console extension types for alerting
- Verify rule evaluation compatibility
- Test with different alert sources

### Translation Updates

- Usually clean backport
- Verify i18next key compatibility
- Run `make test-translations`

## Troubleshooting

### "Module not found" after backport

- Check if imported module exists in target branch version
- Verify package.json dependencies match

### TypeScript errors after adaptation

- Check type definitions between versions
- Use explicit typing where inference differs

### Test failures after backport

- Compare test utilities between versions
- Check for mock/fixture differences

### Build failures

- Verify webpack config compatibility
- Check for console plugin SDK breaking changes

## Backport PR Template

When creating the PR, use this template:

```markdown
## Backport of #<original-PR-number>

### Original Change

<Brief description of the feature or fix>

### Backport Target

- Branch: `$1`
- Logging Version: COO OCP 4.x

### Adaptations Made

- [ ] PatternFly v6 → v5 components adapted
- [ ] React Router v6 → v5 hooks adapted
- [ ] Console SDK API adjustments
- [ ] No adaptations needed (clean cherry-pick)

### Testing

- [ ] `make lint-frontend` passes
- [ ] `make test-backend` passes
- [ ] `npm run test:unit` passes
- [ ] `make test-translations` passes
- [ ] Manual testing performed

### Notes

<Any additional context about the backport>
```

## Quick Reference Commands

```bash
# View commit to backport
git show <commit-hash>

# Compare file between branches
git diff $1:web/src/<file> main:web/src/<file>

# Check dependency versions in target
git show $1:web/package.json | grep -A 5 "patternfly"

# Interactive cherry-pick with edit
git cherry-pick -e <commit-hash>
```
