import { SyntaxNodeRef, Tree } from '@lezer/common';
import { parser } from '@grafana/lezer-logql';

export type LabelMatcher = {
  label?: string;
  operator?: string;
  value?: string;
};
export type PipelineStage = {
  operator?: string;
  value?: string;
  labelsInFilter?: Array<LabelMatcher>;
};

const parseMatchers = (
  syntaxTree: Tree,
  node: SyntaxNodeRef,
  query: string,
): Array<LabelMatcher> => {
  const matchers: Array<LabelMatcher> = [];
  let label: string, operator: string, value: string;

  syntaxTree.iterate({
    from: node.from,
    to: node.to,
    enter(selectorsNode) {
      if (selectorsNode.name === 'Identifier') {
        label = query.slice(selectorsNode.from, selectorsNode.to);

        return false;
      } else if (['Eq', 'Neq', 'Re', 'Nre'].includes(selectorsNode.name)) {
        operator = query.slice(selectorsNode.from, selectorsNode.to);

        return false;
      } else if (selectorsNode.name === 'String') {
        value = query.slice(selectorsNode.from, selectorsNode.to);

        return false;
      }
    },
    leave(selectorsNode) {
      if (selectorsNode.name === 'Matcher') {
        matchers.push({ label, operator, value });
      }
    },
  });

  return matchers;
};

const parsePipelineStages = (
  syntaxTree: Tree,
  node: SyntaxNodeRef,
  query: string,
): Array<PipelineStage> => {
  const pipelineStages: Array<PipelineStage> = [];
  let operator: string, value: string, labelsInFilter: Array<LabelMatcher> | undefined;

  syntaxTree.iterate({
    from: node.from,
    to: node.to,
    enter(selectorsNode) {
      if (selectorsNode.name === 'Pipe') {
        operator = query.slice(selectorsNode.from, selectorsNode.to);

        return false;
      } else if (['PipeExact', 'PipeMatch', 'Nre', 'Neq'].includes(selectorsNode.name)) {
        operator = query.slice(selectorsNode.from, selectorsNode.to);

        return false;
      } else if (
        [
          'LabelParser',
          'JsonExpressionParser',
          'LabelFilter',
          'LineFormatExpr',
          'LabelFormatExpr',
          'String',
        ].includes(selectorsNode.name)
      ) {
        value = query.slice(selectorsNode.from, selectorsNode.to);

        if (selectorsNode.name === 'LabelFilter') {
          labelsInFilter = parseMatchers(syntaxTree, selectorsNode, query);
        }

        return false;
      }
    },
    leave(selectorsNode) {
      if (selectorsNode.name === 'PipelineStage') {
        pipelineStages.push({ operator, value, labelsInFilter });
        labelsInFilter = undefined;
      }
    },
  });

  return pipelineStages;
};

export class LogQLQuery {
  streamSelector: Array<LabelMatcher> = [];
  pipeline: Array<PipelineStage> = [];

  constructor(query: string) {
    const syntaxTree = parser.parse(query);
    let parsedMatchers: Array<LabelMatcher> = [];
    let parsedPipeline: Array<PipelineStage> = [];

    syntaxTree.iterate({
      enter(node) {
        if (node.name === 'Selector' && parsedMatchers.length === 0) {
          parsedMatchers = parseMatchers(syntaxTree, node, query);

          return false;
        } else if (node.name === 'PipelineExpr' && parsedPipeline.length === 0) {
          parsedPipeline = parsePipelineStages(syntaxTree, node, query);

          return false;
        }
      },
    });

    this.streamSelector = parsedMatchers;
    this.pipeline = parsedPipeline;
  }

  removeSelectorMatcher = (matcherToRemove: Partial<LabelMatcher>) => {
    this.streamSelector = this.streamSelector.filter(
      (matcher) => !matcherToRemove.label || matcher.label !== matcherToRemove.label,
    );

    return this;
  };

  addSelectorMatcher = (matchers?: LabelMatcher | Array<LabelMatcher>) => {
    if (!matchers) {
      return this;
    }

    const matchersArray = Array.isArray(matchers) ? matchers : [matchers];

    matchersArray.forEach((matcher) => {
      const existingSelectorIndex = this.streamSelector.findIndex(
        ({ label }) => matcher.label === label,
      );

      if (existingSelectorIndex !== -1) {
        this.streamSelector[existingSelectorIndex] = matcher;
      } else {
        this.streamSelector.push(matcher);
      }
    });

    return this;
  };

  removePipelineStage = (
    pipelineStageToRemove: Partial<PipelineStage>,
    matchOptions?: { matchLabel?: string },
  ) => {
    this.pipeline = this.pipeline.filter((existingStage) => {
      if (
        pipelineStageToRemove.operator &&
        existingStage.operator === pipelineStageToRemove.operator
      ) {
        return false;
      }

      if (pipelineStageToRemove.value && existingStage.value === pipelineStageToRemove.value) {
        return false;
      }

      if (
        matchOptions?.matchLabel &&
        existingStage.labelsInFilter?.every((label) => label.label === matchOptions.matchLabel)
      ) {
        return false;
      }

      return true;
    });

    return this;
  };

  addPipelineStage = (
    newPipelineStage?: PipelineStage | Array<PipelineStage>,
    options?: { placement?: 'start' | 'end' },
  ) => {
    const placement = options?.placement ?? 'start';

    if (!newPipelineStage) {
      return this;
    }

    const stagesArray = Array.isArray(newPipelineStage) ? newPipelineStage : [newPipelineStage];

    if (placement === 'start') {
      this.pipeline.unshift(...stagesArray);
    } else {
      this.pipeline.push(...stagesArray);
    }

    this.pipeline = this.pipeline.filter(
      (stage, index) =>
        this.pipeline.findIndex(
          (existingStage) =>
            stage.operator === existingStage.operator && stage.value === existingStage.value,
        ) === index,
    );

    return this;
  };

  toString = () => {
    return `{ ${this.streamSelector
      .map(({ label, operator, value }) => `${label}${operator}${value}`)
      .join(', ')} }${this.pipeline
      .map(({ operator, value }) => ` ${operator} ${value}`)
      .join('')}`;
  };
}
