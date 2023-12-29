---
title: Dealing with inferred types exceeding serializable length
date: 2023-11-28 00:49:18
tags: typescript, zod
permalink: 2023/11/28/fixing-inferred-types-exceeding-serializable-length/
---

When working with validation libraries like zod, it is quite convenient to extract static types from schemas that perform runtime validations.

However, sometimes when these type compositions get too complex, we can get run into this type error:

```
error TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type
 annotation is needed.
```

This problem happens because when we are composing these schema definitions (zod here), for example:

```typescript
const Department = z.object({
    name: z.string()
})

export const Company = z.object({
    name: z.string(),
    departments: Department.array(),
});
```

While we are using a composition of two schema definitions, when we infer the type we will get a single complex type.

```typescript
type IDepartment = z.output<typeof Department>;
// { name: string }

type ICompany = z.output<typeof Company>
// { name: string, departments: { name: string }[] }
```

Note that `ICompany` type does not make use of `IDepartment` (this would happen even if we defined these types as interfaces instead of aliases). 
The inferred type of each schema definiton is a separate self contained type.

So when we are composing many complex types, the composition's serialized representation includes information about every field of every composed type. This is fine for the simple case here, but it can grow large rapidly for complex types.

Typescript compiler has an upper limit on the size of this serialized representation. When this is exceeded we get the above error.

The solution to this is quite simple. We can reduce the size of the composed type by introducing interfaces for the types it uses.

```typescript
const Department = z.object({
    name: z.string()
})

type IDepartment = z.output<typeof Department>;
type IDepartmentIn = z.input<typeof Department>;

// Explicit type for the runtime schema of Department
export interface IDepartmentRT extends z.ZodType<IDepartment, z.ZodTypeDef, IDepartmentIn> {}

export const Company = z.object({
    name: z.string(),
    departments: (Department as IDepartmentRT).array(),
});

type ICompany = z.output<typeof Company>;
type ICompanyIn = z.input<typeof Company>;
```

Now the serialized representation of `ICompany` will refer to `IDepartmentRT` and so the fields of Department type are not included in the serialized representation, reducing its size. 
And we also don't have to redefine the zod schema separately as an interface. 

