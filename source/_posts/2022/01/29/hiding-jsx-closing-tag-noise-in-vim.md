---
title: Hiding JSX closing tag noise in vim through conceal
date: 2022-01-29
permalink: 2022/01/29/hiding-jsx-closing-tag-noise-in-vim-through-conceal/
tags: [vim]
excerpt: Making JSX more easily scannable by hiding the closing tags through the conceal feature in vim
---

Thanks to popularity of React and other frameworks that have partly embraced its idioms, the verbose JSX syntax extension to javascript remains quite popular in 2022, despite the declining popularity of XML in the industry at large.

While alternatives exist, in most existing projects one can expect to find JSX in use, and alternatives usually don't have as great support from typescript, which has first class support for JSX.

Here is a simple tip that makes code using JSX easier to quickly scan through in vim by getting rid of the closing tag noise at editor level. While the tags still exist in the source code we simply collapse them in the editor. Any project level or source level changes are thus not needed.

The end result looks like this:

![Collapsed end tags](/images/collapsed-end-tags.png)

This is achieved by utilizing the [conceal feature](https://vimhelp.org/syntax.txt.html#conceal) of vim. While the configuration here has only been tested in neovim, it should work on vanilla vim as well.

To achieve the above, we can add the following to `~/.config/nvim/after/syntax/typescriptreact.vim`:

```
if exists('g:no_vim_conceal') || !has('conceal') || &enc != 'utf-8'
  finish
endif

syntax match tsxCloseTag "</.*>" conceal cchar=◆
setlocal conceallevel=1
```

Now any text matching `</.*>` will be concealed and a diamond symbol be shown instead. However if we put the cursor on the specific line, we'll see the actual source.

If you need more info about the `after` directory in vim (as used above) this [vimhelp topic](https://vimhelp.org/options.txt.html#after%2ddirectory) and this [stackexchange thread](https://vi.stackexchange.com/questions/4975/how-can-i-add-additional-syntax-highlighting-rules-in-my-local-vimrc) are good resources.

If you are wondering how to identify the tag name for other syntax forms eg. the `function` keyword, this [vim plugin](https://github.com/gerw/vim-HiLinkTrace) can provide you the complete trace of syntax highlight.

In my setup, `:HLT` gives me the following trace for a closing tag:

```
typescriptBlock->typescriptParenExp->tsxRegion->tsxRegion->tsxRegion->tsxRegion->tsxRegion->tsxRegion->tsxCloseTag  HltTrace: tsxCloseTag->htmlTag->GruvboxBlue   fg<109> bg<>
```
