"use client";

import { useState } from "react";

export type VideoDescriptionProps = {
  title: string;
  views: string;
  postedAt: string;
  description: string;
};

export default function VideoDescription({
  title,
  views,
  postedAt,
  description,
}: VideoDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left cursor-pointer"
    >
      <h1 className="text-lg font-medium">{title}</h1>
      <p className="mt-1 text-sm text-[#6F7979]">
        <span>{views}</span> <span>{postedAt}</span>
        {!expanded && <span className="ml-1 font-medium text-foreground">…more</span>}
      </p>
      {expanded && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
          {description}
          <span className="mt-2 block font-medium text-foreground">Show less</span>
        </p>
      )}
    </button>
  );
}
