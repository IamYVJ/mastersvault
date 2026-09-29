// Interactive wrapper for the authoring preview: try the question, then reveal.
import { useState } from 'react';
import type { RenderedPassage, RenderedQuestion, RenderedSourceSet, ResponseValue } from '../../lib/content/types.ts';
import { emptyResponse, isComplete, isCorrect } from '../../lib/engine/grading.ts';
import QuestionView from './QuestionView.tsx';

interface Props {
  question: RenderedQuestion;
  passage?: RenderedPassage;
  sources?: RenderedSourceSet;
}

export default function PreviewQuestion({ question, passage, sources }: Props) {
  const [response, setResponse] = useState<ResponseValue>(() => emptyResponse(question.response));
  const [reveal, setReveal] = useState(true);
  const complete = isComplete(question.response, response);

  return (
    <div className="preview-q">
      <div className="preview-q-bar">
        <button type="button" className="btn" onClick={() => setReveal((r) => !r)}>
          {reveal ? 'Hide answer' : 'Show answer'}
        </button>
        <button type="button" className="btn" onClick={() => setResponse(emptyResponse(question.response))}>
          Clear
        </button>
        {complete && (
          <span className={`badge ${isCorrect(question.response, response) ? 'badge-accent' : 'badge-warning'}`}>
            {isCorrect(question.response, response) ? 'Correct' : 'Incorrect'}
          </span>
        )}
      </div>
      <QuestionView
        question={question}
        passage={passage}
        sources={sources}
        response={response}
        onChange={setResponse}
        reveal={reveal}
      />
    </div>
  );
}
