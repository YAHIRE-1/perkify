import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Label } from "@perkify/ui/components/label";
import { cn } from "@perkify/ui/lib/utils";
import { Field, type AnyFieldApi, type AnyFormApi } from "@tanstack/react-form";
import * as React from "react";

const FormContext = React.createContext<AnyFormApi | null>(null);
const FieldContext = React.createContext<AnyFieldApi | null>(null);
const ItemContext = React.createContext("");

function Form({
  form,
  children,
}: {
  form: AnyFormApi;
  children: React.ReactNode;
}) {
  return <FormContext.Provider value={form}>{children}</FormContext.Provider>;
}

function FormField({
  name,
  render,
  ...props
}: {
  name: string;
  render: (props: { field: AnyFieldApi }) => React.ReactNode;
  validators?: object;
  defaultValue?: unknown;
}) {
  const form = React.useContext(FormContext);
  if (!form) {
    throw new Error("<FormField> should be used within <Form form={...}>");
  }

  const FieldAny = Field as React.ComponentType<any>;

  return (
    <FieldAny form={form} name={name} {...props}>
      {(field: AnyFieldApi) => (
        <FieldContext.Provider value={field}>
          {render({ field })}
        </FieldContext.Provider>
      )}
    </FieldAny>
  );
}

const useFormField = () => {
  const field = React.useContext(FieldContext);
  const id = React.useContext(ItemContext);

  if (!field) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { errors, isTouched } = field.state.meta;
  const first = errors[0];
  const message =
    isTouched && first
      ? typeof first === "string"
        ? first
        : String(first.message ?? "")
      : "";

  return {
    field,
    message,
    invalid: !!message,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
  };
};

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <ItemContext.Provider value={id}>
      <div className={cn("space-y-2", className)} {...props} />
    </ItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { invalid, formItemId } = useFormField();

  return (
    <Label
      className={cn(
        "font-semibold text-brand",
        invalid && "text-destructive",
        className
      )}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({
  children,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const { invalid, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return useRender({
    render:
      render ??
      (React.isValidElement(children) ? children : <div>{children}</div>),
    props: mergeProps<"div">(
      {
        "aria-describedby": invalid
          ? `${formDescriptionId} ${formMessageId}`
          : formDescriptionId,
        "aria-invalid": invalid,
        id: formItemId,
      },
      props
    ),
  });
}

function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      id={formDescriptionId}
      {...props}
    />
  );
}

function FormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { message, formMessageId } = useFormField();
  const body = message || children;

  if (!body) {
    return null;
  }

  return (
    <p
      className={cn("font-medium text-[0.8rem] text-destructive", className)}
      id={formMessageId}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};