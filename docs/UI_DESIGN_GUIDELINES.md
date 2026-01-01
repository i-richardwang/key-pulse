# KeyPulse UI 设计规范

本文档基于 shadcn/ui 官方设计模式，规范项目中 UI 组件的使用方式。

---

## 1. Button 组件

### 1.1 带文字的按钮

图标放在文字前面时，使用 `data-icon="inline-start"` 属性：

```tsx
// ✅ 正确
<Button>
  <PlusIcon data-icon="inline-start" />
  添加
</Button>

// ❌ 错误 - 不要手动设置图标 className
<Button>
  <PlusIcon className="size-4 mr-1" />
  添加
</Button>
```

### 1.2 纯图标按钮

使用 `size="icon"` 并添加 `sr-only` 无障碍标签：

```tsx
// ✅ 正确
<Button variant="outline" size="icon">
  <DownloadIcon />
  <span className="sr-only">导出</span>
</Button>

// ❌ 错误 - 不要用 className 覆盖尺寸
<Button variant="outline" size="icon" className="size-8">
  <DownloadIcon />
</Button>
```

### 1.3 Button 尺寸规范

| size | 高度 | 使用场景 |
|------|------|----------|
| `default` | h-7 (28px) | 默认按钮，与 Input/Select 高度一致 |
| `sm` | h-6 (24px) | 紧凑场景 |
| `lg` | h-8 (32px) | 强调场景 |
| `icon` | size-7 (28px) | 纯图标按钮 |
| `icon-sm` | size-6 (24px) | 小型图标按钮 |

---

## 2. 表单结构

### 2.1 基本结构

使用 `Field` + `FieldGroup` + `FieldLabel` 组织表单：

```tsx
// ✅ 正确
<form onSubmit={handleSubmit}>
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor="name">姓名</FieldLabel>
      <Input id="name" placeholder="请输入姓名" />
    </Field>

    <Field>
      <FieldLabel htmlFor="role">角色</FieldLabel>
      <Select>
        <SelectTrigger id="role">
          <SelectValue placeholder="选择角色" />
        </SelectTrigger>
        <SelectContent>...</SelectContent>
      </Select>
    </Field>
  </FieldGroup>
</form>

// ❌ 错误 - 不要用 div + Label 替代
<div className="space-y-4">
  <div className="space-y-2">
    <Label>姓名</Label>
    <Input placeholder="请输入姓名" />
  </div>
</div>
```

### 2.2 htmlFor/id 关联规范

**必须关联的情况：**
- Input + FieldLabel
- Textarea + FieldLabel
- Select (通过 SelectTrigger) + FieldLabel
- Checkbox + FieldLabel（当 label 在 checkbox 后面时）

```tsx
// ✅ 正确 - Input
<Field>
  <FieldLabel htmlFor="email">邮箱</FieldLabel>
  <Input id="email" type="email" />
</Field>

// ✅ 正确 - Select
<Field>
  <FieldLabel htmlFor="status">状态</FieldLabel>
  <Select>
    <SelectTrigger id="status">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>...</SelectContent>
  </Select>
</Field>

// ✅ 正确 - Checkbox
<Field orientation="horizontal">
  <Checkbox id="agree" />
  <FieldLabel htmlFor="agree">同意条款</FieldLabel>
</Field>
```

**不需要关联的情况：**
- Switch + FieldLabel（Switch 在前，label 在后）
- 只读显示内容

```tsx
// ✅ 正确 - Switch 不需要 htmlFor
<Field orientation="horizontal">
  <Switch checked={enabled} onCheckedChange={setEnabled} />
  <FieldLabel>启用功能</FieldLabel>
</Field>

// ✅ 正确 - 只读显示
<Field>
  <FieldLabel>API Key</FieldLabel>
  <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
    sk-xxxx...yyyy
  </div>
</Field>
```

### 2.3 Field 布局方向

```tsx
// 垂直布局（默认）
<Field>
  <FieldLabel>标签</FieldLabel>
  <Input />
</Field>

// 水平布局 - 用于 Switch/Checkbox
<Field orientation="horizontal">
  <Switch />
  <FieldLabel>标签</FieldLabel>
</Field>
```

---

## 3. DropdownMenu 组件

### 3.1 图标放置

图标直接放在 DropdownMenuItem 内部，不需要 `data-icon` 属性：

```tsx
// ✅ 正确
<DropdownMenuItem>
  <PencilIcon />
  编辑
</DropdownMenuItem>

// ❌ 错误
<DropdownMenuItem>
  <PencilIcon data-icon="inline-start" />
  编辑
</DropdownMenuItem>
```

### 3.2 危险操作

使用 `variant="destructive"` 而非自定义 className：

```tsx
// ✅ 正确
<DropdownMenuItem variant="destructive">
  <TrashIcon />
  删除
</DropdownMenuItem>

// ❌ 错误
<DropdownMenuItem className="text-destructive">
  <TrashIcon />
  删除
</DropdownMenuItem>
```

---

## 4. Dialog 组件

### 4.1 Dialog 结构

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
      <DialogDescription>描述文字</DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {/* 表单内容 */}
      </FieldGroup>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button type="submit">确认</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 4.2 DialogFooter 间距

DialogFooter 默认有 `gap-2` 间距，**不要覆盖**：

```tsx
// ✅ 正确 - 只添加 margin-top
<DialogFooter className="mt-6">

// ❌ 错误 - 不要覆盖 gap
<DialogFooter className="mt-6 gap-0">
<DialogFooter className="mt-6 sm:gap-0">
```

---

## 5. AlertDialog 组件

### 5.1 使用内置 variant

AlertDialogAction 支持 `variant` prop，不要用 className 覆盖：

```tsx
// ✅ 正确
<AlertDialogAction variant="destructive">
  删除
</AlertDialogAction>

// ❌ 错误
<AlertDialogAction className="bg-destructive hover:bg-destructive/90">
  删除
</AlertDialogAction>
```

---

## 6. 避免覆盖默认样式

### 6.1 组件已有默认值

| 组件 | 默认样式 | 不要重复设置 |
|------|----------|-------------|
| Table | `text-xs` | TableCell 不需要再加 `text-xs` |
| Badge | `text-[0.625rem]` | 不需要加 `text-xs` 或 `text-[10px]` |
| Textarea | `resize-none` | 不需要再加 `resize-none` |
| DialogFooter | `gap-2` | 不需要再加 `gap-2` |
| Button (default) | `h-7` | 不需要额外设置高度 |

### 6.2 使用组件 prop 而非 className

当组件提供了 prop 支持时，优先使用 prop：

```tsx
// ✅ 正确 - 使用 variant prop
<Button variant="destructive">删除</Button>
<AlertDialogAction variant="destructive">确认</AlertDialogAction>
<DropdownMenuItem variant="destructive">删除</DropdownMenuItem>

// ❌ 错误 - 用 className 覆盖
<Button className="bg-destructive">删除</Button>
```

### 6.3 继承父组件样式

子组件会继承父组件的样式，不需要重复设置：

```tsx
// Table 已设置 text-xs，子组件继承

// ✅ 正确
<TableCell>{data}</TableCell>
<TableCell className="text-muted-foreground">{date}</TableCell>

// ❌ 错误 - 重复设置 text-xs
<TableCell className="text-xs">{data}</TableCell>
<TableCell className="text-xs text-muted-foreground">{date}</TableCell>
```

---

## 7. 组件高度一致性

工具栏中的交互组件应保持一致的高度：

| 组件 | 默认高度 |
|------|----------|
| Button (default) | h-7 (28px) |
| Input | h-7 (28px) |
| SelectTrigger | h-7 (28px) |
| Button (icon) | size-7 (28px) |

```tsx
// ✅ 正确 - 所有组件高度一致
<div className="flex items-center gap-2">
  <Button>添加</Button>
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

// ❌ 错误 - 高度不一致
<div className="flex items-center gap-2">
  <Button size="sm">添加</Button>  {/* h-6 */}
  <Select>...</Select>              {/* h-7 */}
</div>
```

---

## 8. 无障碍 (Accessibility)

### 8.1 图标按钮必须有 sr-only 标签

```tsx
<Button size="icon" variant="outline">
  <SettingsIcon />
  <span className="sr-only">设置</span>
</Button>
```

### 8.2 表单元素必须关联 label

通过 htmlFor/id 关联，确保屏幕阅读器可以正确朗读：

```tsx
<FieldLabel htmlFor="username">用户名</FieldLabel>
<Input id="username" />
```

---

## 9. 快速检查清单

在提交代码前，检查以下项目：

- [ ] Button 带图标使用 `data-icon="inline-start"`
- [ ] 图标按钮使用 `size="icon"` + `sr-only`
- [ ] 表单使用 `Field` + `FieldGroup` + `FieldLabel`
- [ ] Input/Select/Textarea 有对应的 id
- [ ] FieldLabel 有对应的 htmlFor（除 Switch 外）
- [ ] 没有用 className 覆盖组件的 variant/size 等 prop
- [ ] 没有重复设置组件默认值（如 text-xs, resize-none）
- [ ] DialogFooter 没有覆盖默认 gap-2
- [ ] 危险操作使用 `variant="destructive"`
