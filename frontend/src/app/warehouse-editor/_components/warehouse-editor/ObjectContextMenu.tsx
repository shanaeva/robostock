import { useEffect, useId, useLayoutEffect, useRef } from 'react';

type ObjectContextMenuProps = {
  x: number;
  y: number;
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
};

export function ObjectContextMenu({
  x,
  y,
  canDelete,
  onDelete,
  onClose,
}: ObjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const blockedMessageId = useId();

  useLayoutEffect(() => {
    const menu = menuRef.current;

    if (!menu) {
      return;
    }

    const margin = 8;
    const { width, height } = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(margin, Math.min(x, window.innerWidth - width - margin))}px`;
    menu.style.top = `${Math.max(margin, Math.min(y, window.innerHeight - height - margin))}px`;
    actionRef.current?.focus({ preventScroll: true });
  }, [x, y, canDelete]);

  useEffect(() => {
    function dismissOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        onClose();
      }
    }

    document.addEventListener('pointerdown', dismissOutside, true);
    window.addEventListener('resize', onClose);

    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Действия с объектом"
      className="fixed z-20 w-52 max-w-[calc(100vw-1rem)] cursor-auto rounded-md border border-zinc-200 bg-white p-1 text-sm text-zinc-900 shadow-lg"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          onClose();
        }
      }}
    >
      <button
        ref={actionRef}
        type="button"
        role="menuitem"
        aria-disabled={!canDelete}
        aria-describedby={canDelete ? undefined : blockedMessageId}
        className="w-full cursor-pointer rounded px-2 py-1.5 text-left font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 aria-disabled:cursor-default aria-disabled:text-zinc-500 aria-disabled:hover:bg-transparent"
        onClick={onDelete}
      >
        Удалить
      </button>
      {!canDelete && (
        <p id={blockedMessageId} className="px-2 pb-1 text-xs text-zinc-600">
          Сначала удалите привязанных роботов.
        </p>
      )}
    </div>
  );
}
