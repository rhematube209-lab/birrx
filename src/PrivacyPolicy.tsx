import policy from '../public/privacy.html?raw';
// Bundled, author-controlled static policy; no user or network HTML is rendered.
export function PrivacyPolicy(){return <section className="legal-policy" dangerouslySetInnerHTML={{__html:policy.match(/<main>([\s\S]*)<\/main>/)?.[1]||''}}/>;}
