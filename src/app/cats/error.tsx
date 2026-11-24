"use client";

import { Button } from "@/components/ui/button";

export default function CatsError({ reset }: { reset: () => void }) {
  return <div><p role="alert">بارگذاری پرونده انجام نشد.</p><Button onClick={reset}>تلاش دوباره</Button></div>;
}
