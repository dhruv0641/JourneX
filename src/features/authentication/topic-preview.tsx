'use client';

import { useState } from 'react';
import { BookOpen, Clock, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const itinerary = ['Choose a neighborhood to stay in', 'Map the river walk', 'Pack a sketchbook'];
const sessions = [
  { title: 'Reading the guidebook', time: '25 min' },
  { title: 'Planning the walking route', time: '15 min' },
];

export function TopicPreview() {
  const [completed, setCompleted] = useState([true, false, false]);
  return (
    <section
      id="sample-topic"
      tabIndex={-1}
      aria-labelledby="sample-title"
      className="jx-enter rounded-[1.6rem] border border-border bg-card shadow-md focus-visible:outline-2 focus-visible:outline-ring"
    >
      <header className="relative isolate overflow-hidden rounded-t-[1.55rem] bg-[#38212f] p-5 text-[#fff8ec] sm:p-8">
        <div
          className="absolute -right-12 -top-16 -z-10 size-56 rotate-[-20deg] rounded-[45%] border border-[#d9b87c]/45 sm:size-72"
          aria-hidden="true"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className="absolute rounded-[45%] border border-[#d9b87c]/35"
              style={{ inset: n * 11 }}
            />
          ))}
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[#ddc6aa]/50 bg-[#38212f] px-2.5 py-1 text-xs font-medium">
          <MapPin size={13} aria-hidden="true" /> Example topic
        </p>
        <h2
          id="sample-title"
          className="mt-6 max-w-[12ch] font-serif text-4xl leading-[1.02] tracking-tight sm:text-5xl"
        >
          A weekend in Kyoto
        </h2>
      </header>
      <Tabs defaultValue="tasks" className="p-4 sm:p-6">
        <TabsList aria-label="Explore the example topic" className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="focus">Focus</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="min-h-40 pt-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Trip checklist</h3>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {completed.filter(Boolean).length} of 3 done
            </span>
          </div>
          <ul className="divide-y divide-border">
            {itinerary.map((item, index) => (
              <li key={item}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={completed[index]}
                    onChange={() =>
                      setCompleted((previous) =>
                        previous.map((value, i) => (i === index ? !value : value)),
                      )
                    }
                    className="peer size-5 shrink-0 cursor-pointer accent-success focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <span className="peer-checked:text-muted-foreground peer-checked:line-through">
                    {item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="focus" className="min-h-40 pt-2">
          <h3 className="mb-2 font-semibold">Focus sessions</h3>
          <ul className="divide-y divide-border">
            {sessions.map((session) => (
              <li key={session.title} className="flex min-h-12 items-center gap-2 text-sm">
                <Clock size={15} className="shrink-0 text-accent" aria-hidden="true" />
                {session.title}
                <span className="ml-auto shrink-0 text-muted-foreground">{session.time}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="journal" className="min-h-40 pt-2">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen size={17} className="text-accent" aria-hidden="true" />
            <h3 className="font-semibold">A note for the morning</h3>
          </div>
          <p className="max-w-prose border-s-2 border-accent/60 ps-3 font-serif text-xl italic leading-relaxed">
            Leave the first hour open. Walk along the Kamo River before choosing a café.
          </p>
        </TabsContent>
      </Tabs>
    </section>
  );
}
