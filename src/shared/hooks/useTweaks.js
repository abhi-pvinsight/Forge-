import { useState } from 'react';

export default function useTweaks(initial = {}) {
  const [tweaks, setTweaks] = useState(initial);
  return { tweaks, setTweaks };
}
