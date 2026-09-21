// 轻量路由（history API + pushState，配合 nginx SPA 回退）
import { useEffect, useState, type ReactNode } from 'react';

export function navigate(to: string): void {
  if (to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export function Link(props: { to: string; className?: string; children: ReactNode; title?: string; 'data-testid'?: string }) {
  return (
    <a
      href={props.to}
      className={props.className}
      title={props.title}
      data-testid={props['data-testid']}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(props.to);
      }}
    >
      {props.children}
    </a>
  );
}

/** 按模式取路由参数：useParams('/plan/:id') → { id } */
export function useParams(pattern: string): Record<string, string> {
  const path = usePath();
  const pp = pattern.split('/').filter(Boolean);
  const segs = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  if (pp.length !== segs.length) return params;
  pp.forEach((p, i) => {
    if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segs[i]);
  });
  return params;
}

/** 匹配 /plan/:id 与 /plan/:id/print */
export function matchPlanPath(path: string): { id: string; print: boolean } | null {
  const m = /^\/plan\/([^/]+)(\/print)?$/.exec(path);
  if (!m) return null;
  return { id: decodeURIComponent(m[1]), print: m[2] === '/print' };
}
