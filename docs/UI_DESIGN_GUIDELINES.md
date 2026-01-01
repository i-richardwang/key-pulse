# KeyPulse UI Design Guidelines

This document is based on shadcn/ui official design patterns, standardizing UI component usage in the project.

---

## 1. Button Component

### 1.1 Buttons with Text

When placing an icon before text, use the `data-icon="inline-start"` attribute:

```tsx
// ✅ Correct
<Button>
  <PlusIcon data-icon="inline-start" />
  Add
</Button>

// ❌ Incorrect - don't manually set icon className
<Button>
  <PlusIcon className="size-4 mr-1" />
  Add
</Button>
```

### 1.2 Icon-only Buttons

Use `size="icon"` and add an `sr-only` accessibility label:

```tsx
// ✅ Correct
<Button variant="outline" size="icon">
  <DownloadIcon />
  <span className="sr-only">Export</span>
</Button>

// ❌ Incorrect - don't use className to override size
<Button variant="outline" size="icon" className="size-8">
  <DownloadIcon />
</Button>
```

### 1.3 Button Size Reference

| size | Height | Use Case |
|------|--------|----------|
| `default` | h-7 (28px) | Default button, same height as Input/Select |
| `sm` | h-6 (24px) | Compact scenarios |
| `lg` | h-8 (32px) | Emphasized scenarios |
| `icon` | size-7 (28px) | Icon-only buttons |
| `icon-sm` | size-6 (24px) | Small icon buttons |

---

## 2. Form Structure

### 2.1 Basic Structure

Use `Field` + `FieldGroup` + `FieldLabel` to organize forms:

```tsx
// ✅ Correct
<form onSubmit={handleSubmit}>
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input id="name" placeholder="Enter name" />
    </Field>

    <Field>
      <FieldLabel htmlFor="role">Role</FieldLabel>
      <Select>
        <SelectTrigger id="role">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>...</SelectContent>
      </Select>
    </Field>
  </FieldGroup>
</form>

// ❌ Incorrect - don't use div + Label instead
<div className="space-y-4">
  <div className="space-y-2">
    <Label>Name</Label>
    <Input placeholder="Enter name" />
  </div>
</div>
```

### 2.2 htmlFor/id Association Rules

**Required associations:**
- Input + FieldLabel
- Textarea + FieldLabel
- Select (via SelectTrigger) + FieldLabel
- Checkbox + FieldLabel (when label is after checkbox)

```tsx
// ✅ Correct - Input
<Field>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" type="email" />
</Field>

// ✅ Correct - Select
<Field>
  <FieldLabel htmlFor="status">Status</FieldLabel>
  <Select>
    <SelectTrigger id="status">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>...</SelectContent>
  </Select>
</Field>

// ✅ Correct - Checkbox
<Field orientation="horizontal">
  <Checkbox id="agree" />
  <FieldLabel htmlFor="agree">Agree to terms</FieldLabel>
</Field>
```

**No association needed:**
- Switch + FieldLabel (Switch first, label after)
- Read-only display content

```tsx
// ✅ Correct - Switch doesn't need htmlFor
<Field orientation="horizontal">
  <Switch checked={enabled} onCheckedChange={setEnabled} />
  <FieldLabel>Enable feature</FieldLabel>
</Field>

// ✅ Correct - Read-only display
<Field>
  <FieldLabel>API Key</FieldLabel>
  <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
    sk-xxxx...yyyy
  </div>
</Field>
```

### 2.3 Field Layout Direction

```tsx
// Vertical layout (default)
<Field>
  <FieldLabel>Label</FieldLabel>
  <Input />
</Field>

// Horizontal layout - for Switch/Checkbox
<Field orientation="horizontal">
  <Switch />
  <FieldLabel>Label</FieldLabel>
</Field>
```

---

## 3. DropdownMenu Component

### 3.1 Icon Placement

Icons go directly inside DropdownMenuItem, no `data-icon` attribute needed:

```tsx
// ✅ Correct
<DropdownMenuItem>
  <PencilIcon />
  Edit
</DropdownMenuItem>

// ❌ Incorrect
<DropdownMenuItem>
  <PencilIcon data-icon="inline-start" />
  Edit
</DropdownMenuItem>
```

### 3.2 Destructive Actions

Use `variant="destructive"` instead of custom className:

```tsx
// ✅ Correct
<DropdownMenuItem variant="destructive">
  <TrashIcon />
  Delete
</DropdownMenuItem>

// ❌ Incorrect
<DropdownMenuItem className="text-destructive">
  <TrashIcon />
  Delete
</DropdownMenuItem>
```

---

## 4. Dialog Component

### 4.1 Dialog Structure

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {/* Form content */}
      </FieldGroup>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit">Confirm</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 4.2 DialogFooter Spacing

DialogFooter has default `gap-2` spacing, **do not override**:

```tsx
// ✅ Correct - only add margin-top
<DialogFooter className="mt-6">

// ❌ Incorrect - don't override gap
<DialogFooter className="mt-6 gap-0">
<DialogFooter className="mt-6 sm:gap-0">
```

---

## 5. AlertDialog Component

### 5.1 Use Built-in Variant

AlertDialogAction supports `variant` prop, don't use className to override:

```tsx
// ✅ Correct
<AlertDialogAction variant="destructive">
  Delete
</AlertDialogAction>

// ❌ Incorrect
<AlertDialogAction className="bg-destructive hover:bg-destructive/90">
  Delete
</AlertDialogAction>
```

---

## 6. Avoid Overriding Default Styles

### 6.1 Components Have Default Values

| Component | Default Style | Don't Repeat |
|-----------|--------------|--------------|
| Table | `text-xs` | TableCell doesn't need `text-xs` |
| Badge | `text-[0.625rem]` | Don't add `text-xs` or `text-[10px]` |
| Textarea | `resize-none` | Don't add `resize-none` |
| DialogFooter | `gap-2` | Don't add `gap-2` |
| Button (default) | `h-7` | Don't set height explicitly |

### 6.2 Use Component Props Instead of className

When components provide prop support, prefer using props:

```tsx
// ✅ Correct - use variant prop
<Button variant="destructive">Delete</Button>
<AlertDialogAction variant="destructive">Confirm</AlertDialogAction>
<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>

// ❌ Incorrect - using className to override
<Button className="bg-destructive">Delete</Button>
```

### 6.3 Inheriting Parent Component Styles

Child components inherit parent styles, no need to repeat:

```tsx
// Table has text-xs, child components inherit

// ✅ Correct
<TableCell>{data}</TableCell>
<TableCell className="text-muted-foreground">{date}</TableCell>

// ❌ Incorrect - repeating text-xs
<TableCell className="text-xs">{data}</TableCell>
<TableCell className="text-xs text-muted-foreground">{date}</TableCell>
```

---

## 7. Component Height Consistency

Interactive components in toolbars should maintain consistent height:

| Component | Default Height |
|-----------|---------------|
| Button (default) | h-7 (28px) |
| Input | h-7 (28px) |
| SelectTrigger | h-7 (28px) |
| Button (icon) | size-7 (28px) |

```tsx
// ✅ Correct - all components have consistent height
<div className="flex items-center gap-2">
  <Button>Add</Button>
  <Select>
    <SelectTrigger className="w-[120px]">
      <SelectValue />
    </SelectTrigger>
  </Select>
  <Input className="w-[160px]" />
  <Button size="icon" variant="outline">
    <DownloadIcon />
  </Button>
</div>

// ❌ Incorrect - inconsistent heights
<div className="flex items-center gap-2">
  <Button size="sm">Add</Button>  {/* h-6 */}
  <Select>...</Select>            {/* h-7 */}
</div>
```

---

## 8. Accessibility

### 8.1 Icon Buttons Must Have sr-only Labels

```tsx
<Button size="icon" variant="outline">
  <SettingsIcon />
  <span className="sr-only">Settings</span>
</Button>
```

### 8.2 Form Elements Must Be Associated with Labels

Associate via htmlFor/id to ensure screen readers can correctly announce:

```tsx
<FieldLabel htmlFor="username">Username</FieldLabel>
<Input id="username" />
```

---

## 9. Quick Checklist

Before submitting code, check the following:

- [ ] Buttons with icons use `data-icon="inline-start"`
- [ ] Icon buttons use `size="icon"` + `sr-only`
- [ ] Forms use `Field` + `FieldGroup` + `FieldLabel`
- [ ] Input/Select/Textarea have corresponding id
- [ ] FieldLabel has corresponding htmlFor (except Switch)
- [ ] Not using className to override component variant/size props
- [ ] Not repeating component defaults (like text-xs, resize-none)
- [ ] DialogFooter doesn't override default gap-2
- [ ] Destructive actions use `variant="destructive"`
