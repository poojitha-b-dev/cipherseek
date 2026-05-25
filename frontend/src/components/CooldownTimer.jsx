import { useEffect, useState } from "react";

export default function CooldownTimer({ unlocksAt, onUnlocked }) {
const [remaining, setRemaining] = useState("");

useEffect(() => {
const tick = () => {
const diff = unlocksAt - Date.now();

```
  if (diff <= 0) {
    onUnlocked();
    return;
  }

  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  setRemaining(`${m}:${s.toString().padStart(2, "0")}`);
};

tick();

const id = setInterval(tick, 1000);

return () => clearInterval(id);
```

}, [unlocksAt, onUnlocked]);

return (
<p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
Try again in{" "}
<strong style={{ color: "var(--text)" }}>
{remaining} </strong> </p>
);
}
