import { cn } from "@perkify/ui/lib/utils";
import type { Ref } from "react";
import Select from "react-select";
import type { ClassNamesConfig, GroupBase, Props, SelectInstance } from "react-select";

export const selectClassNames = {
  control: (state) =>
    cn(
      "min-h-9 rounded-md border border-input bg-background px-3 text-base md:text-sm",
      state.isFocused && "border-ring ring-2 ring-ring/50",
      state.isDisabled && "opacity-50"
    ),
  valueContainer: () => "gap-1 py-0.5",
  placeholder: () => "text-muted-foreground",
  singleValue: () => "text-foreground",
  input: () => "text-foreground",
  indicatorsContainer: () => "gap-1",
  indicatorSeparator: () => "hidden",
  dropdownIndicator: (state) =>
    cn("text-muted-foreground", state.isDisabled && "opacity-30"),
  clearIndicator: () => "text-muted-foreground hover:text-foreground",
  menu: () =>
    "z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
  option: (state) =>
    cn(
      "cursor-pointer rounded-sm px-2 py-1.5 text-base md:text-sm",
      state.isFocused && "bg-accent text-accent-foreground",
      state.isSelected && "bg-primary text-primary-foreground",
      state.isDisabled && "opacity-50"
    ),
  noOptionsMessage: () => "px-2 py-1.5 text-muted-foreground text-sm",
  multiValue: () => "gap-1 rounded-sm bg-muted px-1.5 py-0.5",
  multiValueLabel: () => "text-foreground text-sm",
  multiValueRemove: () => "rounded-sm hover:bg-destructive/10 hover:text-destructive",
} satisfies ClassNamesConfig<unknown, boolean, GroupBase<unknown>>;

type ReactSelectProps<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
> = Props<Option, IsMulti, Group> & {
  ref?: Ref<SelectInstance<Option, IsMulti, Group>>;
};

export function ReactSelect<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ classNames, ref, ...props }: ReactSelectProps<Option, IsMulti, Group>) {
  return (
    <div className="notranslate" translate="no">
      <Select<Option, IsMulti, Group>
        classNames={{
        ...(selectClassNames as unknown as ClassNamesConfig<Option, IsMulti, Group>),          ...classNames,
        }}
        ref={ref}
        unstyled
        {...props}
      />
    </div>
  );
}

export default ReactSelect;