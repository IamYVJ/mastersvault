// Renders one question in any of the eight formats. The test engine, the
// results review and the authoring preview all use this component.
//
// Layout follows the exam: questions with a shared passage or tabbed sources
// get a split screen (stimulus left, question right); everything else is a
// single column.
import 'katex/dist/katex.min.css';
import './questions.css';
import type { ReactNode } from 'react';
import type { RenderedPassage, RenderedQuestion, RenderedSourceSet, ResponseValue } from '../../lib/content/types.ts';
import Chart from './Chart.tsx';
import DataTable from './DataTable.tsx';
import { ChoiceList, DichotomousGrid, DropdownStatements, TwoPartGrid } from './Responses.tsx';
import SourceTabs from './SourceTabs.tsx';

export interface QuestionViewProps {
  question: RenderedQuestion;
  passage?: RenderedPassage;
  sources?: RenderedSourceSet;
  response: ResponseValue;
  /** Omit to render read-only. */
  onChange?: (value: ResponseValue) => void;
  /** Mark correct/incorrect answers and show the explanation. */
  reveal?: boolean;
  /** Extra content under the explanation, e.g. a "report an issue" link. */
  explanationFooter?: ReactNode;
}

export default function QuestionView({
  question: q,
  passage,
  sources,
  response,
  onChange,
  reveal = false,
  explanationFooter,
}: QuestionViewProps) {
  const name = `q-${q.id}`;
  const spec = q.response;
  const props = { value: response, onChange, reveal, name };

  const answer =
    spec.kind === 'choice' ? (
      <ChoiceList spec={spec} {...props} />
    ) : spec.kind === 'dichotomous' ? (
      <DichotomousGrid spec={spec} {...props} />
    ) : spec.kind === 'dropdowns' ? (
      <DropdownStatements spec={spec} {...props} />
    ) : (
      <TwoPartGrid spec={spec} {...props} />
    );

  const stimulus = q.stimulus;
  const inline =
    stimulus?.kind === 'table' ? (
      <DataTable table={stimulus.table} id={name} />
    ) : stimulus?.kind === 'chart' ? (
      <Chart chart={stimulus.chart} />
    ) : null;

  const main = (
    <div className="q-main">
      {q.stem && <div className="q-stem q-prose" dangerouslySetInnerHTML={{ __html: q.stem }} />}
      {inline}
      {answer}
      {reveal && (
        <section className="q-explanation">
          <h3>Explanation</h3>
          <div className="q-prose" dangerouslySetInnerHTML={{ __html: q.explanation }} />
          {explanationFooter}
        </section>
      )}
    </div>
  );

  if (stimulus?.kind === 'passage' || stimulus?.kind === 'sources') {
    return (
      <div className="q-view q-split">
        <div className="q-stimulus">
          {stimulus.kind === 'passage' && passage && (
            <article className="q-passage q-prose">
              <div dangerouslySetInnerHTML={{ __html: passage.html }} />
            </article>
          )}
          {stimulus.kind === 'sources' && sources && <SourceTabs sources={sources} />}
        </div>
        {main}
      </div>
    );
  }
  return <div className="q-view q-single">{main}</div>;
}
