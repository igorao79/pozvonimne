"use client"

import * as React from "react"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

interface CollapsibleContentProps {
  children: React.ReactNode
}

const CollapsibleContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

const Collapsible: React.FC<CollapsibleProps> = ({
  open: controlledOpen,
  onOpenChange,
  children,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({
  asChild,
  children,
}) => {
  const { open, setOpen } = React.useContext(CollapsibleContext)

  const handleClick = () => {
    setOpen(!open)
  }

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
    })
  }

  return (
    <button onClick={handleClick} type="button">
      {children}
    </button>
  )
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ children }) => {
  const { open } = React.useContext(CollapsibleContext)

  return (
    <div
      style={{
        overflow: 'hidden',
        transition: 'height 0.3s ease-in-out',
        height: open ? 'auto' : '0',
      }}
    >
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
