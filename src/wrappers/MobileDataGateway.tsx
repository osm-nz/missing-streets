import { type PropsWithChildren, useState } from "react";

const isMobileDevice = /Android|iP(hone|[oa]d)/i.test(navigator.userAgent);

export const MobileDataGateway: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(
    !isMobileDevice || !!localStorage.ackMobileData
  );

  if (isConfirmed) return children;

  return (
    <div style={{ margin: 32 }}>
      This app may download 10-100 MB of data, depending on how many issues
      there are in your region.
      <br />
      <br />
      Please check if you're using mobile data before continuing.
      <br />
      <br />
      <button
        style={{ fontSize: 24 }}
        onClick={() => {
          setIsConfirmed(true);
          localStorage.ackMobileData = 1;
        }}
      >
        Continue
      </button>
    </div>
  );
};
