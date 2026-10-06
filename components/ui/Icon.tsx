const paths = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  inbox: "M4 4h16l2 11v5H2v-5L4 4z M2 15h6l2 3h4l2-3h6",
  question:
    "M8 9a4 4 0 0 1 8 0c0 3-4 3-4 6 M12 18h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3z m-4 9 3 3 5-6",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18",
  logout: "M9 4H4v16h5 M10 12h11 m-5-5 5 5-5 5",
  link: "m10 13 4-4 M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0",
};
export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      className="ui-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
