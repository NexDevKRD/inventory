'use client';
export function LanguageSwitcher() {
  return (
    <select className="rounded border px-2 py-1 text-sm" defaultValue="en" onChange={(e) => { document.cookie = `NEXT_LOCALE=${e.target.value}`; location.reload(); }}>
      <option value="en">EN</option>
      <option value="ar">AR</option>
      <option value="ku">KU</option>
    </select>
  );
}
