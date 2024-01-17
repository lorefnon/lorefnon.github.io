---
title: Effectively working with csv files in neovim
tags: [csv, vim]
date: 2024-01-17 13:11:37
permalink: 2024/01/17/Effectively-working-with-csv-files-in-vim/
---

I have been looking for ways to effectively make quick edits to CSV files in (neo)vim without needing to fire up another gui.

This post outlines the quick setup that I have found to be effective. 

## [Rainbow CSV plugin](https://github.com/cameron-wags/rainbow_csv.nvim)

Rainbow CSV is a nice plugin (available for many editors) which colors the csv in a different color for each column. This makes it easy to distinguish between values in different columns.

Here is what this looks like editing an example file: 

![Colored csv files](/images/rainbow-csv-1.png)

Another convenient feature is `:RainbowAlign` which vertically aligns the columns.

![Colored vertically aligned csv files](/images/rainbow-csv-2.png)

Be careful that this is actually adding spaces in the file contents, so anything that consumes your csv will likely need to trim the cell contents.

Its also super convenient that as we move about in the csv, the footer shows the column we are currently at:

![Status footer](/images/rainbow-csv-5.png)

The plugin also supports an inbuilt query language but for anything more complex than basic search, I find myself reaching to SQLite which makes it really easy to [import csv files](https://www.sqlitetutorial.net/sqlite-import-csv/) into a table.

## Frozen headers

If you want a slightly more spreadsheet like feel with the header frozen on top, we can achieve that using core vim features.

We can use `:sp` to horizontally split the screen into two windows, and then use `Ctrl+w 1 _` to resize the top one to show single row.

After that we can `:set scrollopt=hor` to configure scroll binding behavior to horizontal sync and after that `:set scrollbind` in both windows will ensure that as we move about in the primary window the headers stay in sync.

![split screen with headers](/images/rainbow-csv-3.png)

