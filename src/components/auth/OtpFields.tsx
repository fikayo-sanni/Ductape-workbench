import { useRef } from "react";

const EMPTY_OTP = ["", "", "", "", "", ""];

type OtpFieldsProps = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  inputRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
  className?: string;
};

export function emptyOtpDigits(): string[] {
  return [...EMPTY_OTP];
}

export default function OtpFields({
  value,
  onChange,
  disabled,
  inputRefs,
  className,
}: OtpFieldsProps) {
  const localRefs = useRef<(HTMLInputElement | null)[]>([]);
  const refs = inputRefs ?? localRefs;

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      const next = [...value];
      next[index] = "";
      onChange(next);
      return;
    }
    if (digits.length === 1) {
      const next = [...value];
      next[index] = digits;
      onChange(next);
      if (index < 5) refs.current[index + 1]?.focus();
      return;
    }
    const next = emptyOtpDigits();
    digits
      .slice(0, 6)
      .split("")
      .forEach((digit, i) => {
        next[i] = digit;
      });
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = emptyOtpDigits();
    pasted.split("").forEach((digit, i) => {
      next[i] = digit;
    });
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className={className ?? "flex justify-center gap-2"}>
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of 6`}
          className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold border border-grey-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white text-grey"
        />
      ))}
    </div>
  );
}
