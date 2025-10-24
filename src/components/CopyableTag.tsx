import { useState } from 'react';
import { Check } from 'lucide-react';

export default function CopyableTag({
  tag,
  className,
}: {
  tag: string;
  className: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tag || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // show check for 1.5s
  };

  return (
    <h1 onClick={handleCopy} className={className} title="Click to copy">
      {copied ? (
        <span className="text-green">
          <Check className="w-4 h-4" />{' '}
        </span>
      ) : (
        <></>
      )}{' '}
      {tag}
    </h1>
  );
}
