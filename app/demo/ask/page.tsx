import { DemoComposer } from "@/components/DemoComposer";
export const metadata = { title: "Send a message · Demo" };
export default function AskDemo() {
  return <DemoComposer kind="message" />;
}
