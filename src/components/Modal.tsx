import { PropsWithChildren } from "react";

export const Modal: React.FC<PropsWithChildren & { onClose(): void }> = ({
  children,
  onClose,
}) => {
  return (
    <dialog open>
      {children}
      <form method="dialog">
        <button className="nice" type="submit" onClick={onClose}>
          Close
        </button>
      </form>
    </dialog>
  );
};
