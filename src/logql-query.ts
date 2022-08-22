import { notEmptyString, trim } from './value-utils';

export class LogQLQuery {
  selectors: Array<string> = [];
  pipeline: Array<string> = [];

  constructor(query: string) {
    const parts = query.match(/.*{([^}]*)}(.*)/);
    this.selectors =
      parts && parts[1].length > 0
        ? parts[1].split(',').filter(notEmptyString).map(trim)
        : [];
    this.pipeline =
      parts && parts[2].length > 0
        ? parts[2].split('|').filter(notEmptyString).map(trim)
        : [];
  }

  appendSelector = (newSelectors: string | Array<string>) => {
    if (Array.isArray(newSelectors)) {
      this.selectors.push(...newSelectors);
    } else {
      this.selectors.push(newSelectors);
    }

    this.selectors = this.selectors.filter(notEmptyString).map(trim);

    return this;
  };

  appendPipeline = (newPipeline: string | Array<string>) => {
    if (Array.isArray(newPipeline)) {
      this.pipeline.push(...newPipeline);
    } else {
      this.pipeline.push(newPipeline);
    }

    this.pipeline = this.pipeline.filter(notEmptyString).map(trim);

    return this;
  };

  toString = () => {
    return `{ ${this.selectors.join(', ')} }${
      this.pipeline.length > 0 ? ` | ${this.pipeline.join(' | ')}` : ''
    }`;
  };
}
