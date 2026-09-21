// The print rules are kept out of the bundled stylesheet and injected here, so the same source can
// serve two jobs: paper (media="print") and the on-screen preview of the ?yazdir=1 page (media="all").
// That preview is the way out on phones, where iOS gives a web app no print dialog at all.
import printCss from '../print.css?inline';

export default function PrintStyles({ onScreen = false }: { onScreen?: boolean }) {
  return <style media={onScreen ? 'all' : 'print'}>{printCss}</style>;
}
