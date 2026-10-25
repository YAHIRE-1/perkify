import { PanelLeft } from 'lucide-react';
import * as React from 'react';
import { Button } from "@perkify/ui/components/button"
import { cn } from 'cn';

const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

/* ---------------------------------- Provider --------------------------------- */

type SidebarProviderProps = React.ComponentProps<'div'> & {
  /** Estado inicial en escritorio. En móvil siempre inicia cerrada. */
  defaultOpen?: boolean;
};

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);

  // Alterna ambos estados: el CSS (breakpoint md) decide cuál se ve.
  const toggleSidebar = React.useCallback(() => {
    setOpen((value) => !value);
    setOpenMobile((value) => !value);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
      // Escape cierra el panel en móvil
      if (event.key === 'Escape') {
        setOpenMobile(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextProps>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [open, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn('flex min-h-svh w-full', className)}
        style={
          { '--sidebar-width': SIDEBAR_WIDTH, ...style } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

/* ---------------------------------- Sidebar ---------------------------------- */

/**
 * Mobile first:
 * - Base (móvil): panel fuera de pantalla que se desliza sobre el contenido con un fondo oscuro.
 * - md y superior: panel fijo al costado que ocupa espacio y se puede colapsar.
 */
function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<'aside'>) {
  const { state, openMobile, setOpenMobile } = useSidebar();

  return (
    <div
      className="group/sidebar shrink-0"
      data-mobile={openMobile ? 'open' : 'closed'}
      data-state={state}
    >
      {/* Fondo oscuro (solo móvil) */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 md:hidden',
          'pointer-events-none opacity-0',
          'group-data-[mobile=open]/sidebar:pointer-events-auto group-data-[mobile=open]/sidebar:opacity-100'
        )}
        onClick={() => setOpenMobile(false)}
      />

      {/* Espacio reservado (solo escritorio) */}
      <div
        className={cn(
          'hidden transition-[width] duration-200 ease-linear md:block md:h-svh md:w-(--sidebar-width)',
          'md:group-data-[state=collapsed]/sidebar:w-0'
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          // Móvil
          'invisible fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r bg-background transition-[transform,visibility] duration-200 ease-linear',
          'group-data-[mobile=open]/sidebar:visible group-data-[mobile=open]/sidebar:translate-x-0',
          // Escritorio
          'md:visible md:z-10 md:w-(--sidebar-width) md:translate-x-0',
          'md:group-data-[state=collapsed]/sidebar:invisible md:group-data-[state=collapsed]/sidebar:-translate-x-full',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
        <Button
        className={className}
        onClick={(event) => {
            onClick?.(event);
            toggleSidebar();
        }}
        size="icon-sm"
        variant="ghost"
        {...props}
        >
        <PanelLeft />
        <span className="sr-only">Abrir o cerrar menú</span>
        </Button>
  );
}

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<'main'>) {
  return (
    <main
      className={cn('relative flex min-h-svh min-w-0 flex-1 flex-col bg-background', className)}
      {...props}
    />
  );
}

/* ----------------------------- Secciones y menú ------------------------------ */

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('relative', className)} {...props} />;
}

type SidebarMenuButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'variant' | 'size'
> & {
  isActive?: boolean;
};


function SidebarMenuButton({
  isActive = false,
  className,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <Button
      className={cn('w-full justify-start overflow-hidden', className)}
      data-active={isActive}
      variant={isActive ? 'default' : 'ghost'}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};