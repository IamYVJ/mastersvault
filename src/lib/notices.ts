// The site description and disclaimer for the exams the site currently shows. Build-time only: it
// reads the content.
import { getExams } from './content/index.ts';
import { disclaimer, siteDescription, type ExamNotice } from './site.ts';

const notices = (): ExamNotice[] => getExams().map((e) => ({ name: e.config.name, testMaker: e.config.testMaker, trademark: e.config.trademark }));

export const SITE_DESCRIPTION = () => siteDescription(notices());
export const DISCLAIMER = () => disclaimer(notices());
/** "the Graduate Management Admission Council (GMAC) or Educational Testing Service (ETS)" */
export const TEST_MAKERS = () => {
  const makers = notices().map((n) => n.testMaker);
  return makers.length <= 1 ? (makers[0] ?? '') : `${makers.slice(0, -1).join(', ')} or ${makers[makers.length - 1]}`;
};
