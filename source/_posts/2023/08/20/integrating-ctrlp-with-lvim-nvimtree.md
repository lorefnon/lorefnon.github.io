---
title: integrating CtrlP with Nvimtree in lunarvim
date: 2023-08-20 12:23:01
tags: [Vim, Neovim, CtrlP, Neotree]
---

[Lunarvim](https://www.lunarvim.org) comes preconfigured with [Nvimtree](https://github.com/nvim-tree/nvim-tree.lua) - a nice directory tree browser which is also extensible through lua.

This is a quick recipe to integrate it with [CtrlP](https://ctrlpvim.github.io/ctrlp.vim/) - my preferred file finder for vim.

In `~/.config/lvim/lua/treeutils.lua`:

```lua
local api = require("nvim-tree.api")
local M = {}

-- Launch CtrlP from selected tree node
function M.launch_ctrlp()
    local node = api.tree.get_node_under_cursor()
    local is_folder = node.fs_stat and node.fs_stat.type == 'directory' or false
    local basedir = is_folder and node.absolute_path or vim.fn.fnamemodify(node.absolute_path, ":h")
    vim.cmd("CtrlP " .. basedir)
end

return M
```

In `~/.config/lvim/config.lua`:

```lua
lvim.builtin.nvimtree.setup.on_attach = function(bufnr)
    local api       = require "nvim-tree.api"
    local treeutils = require "treeutils"

    local function opts(desc)
        return { desc = "nvim-tree: " .. desc, buffer = bufnr, noremap = true, silent = true, nowait = true }
    end

    api.config.mappings.default_on_attach(bufnr)

    local useful_keys = {
        ["<C-p>"] = { treeutils.launch_ctrlp, opts "Launch CtrlP" },

        -- Other useful keybindings - cherry pick
        ["l"] = { api.node.open.edit, opts "Open" },
        ["o"] = { api.node.open.edit, opts "Open" },
        ["<CR>"] = { api.node.open.edit, opts "Open" },
        ["v"] = { api.node.open.vertical, opts "Open: Vertical Split" },
        ["h"] = { api.node.navigate.parent_close, opts "Close Directory" },
        ["C"] = { api.tree.change_root_to_node, opts "CD" },
    }

    require("lvim.keymappings").load_mode("n", useful_keys)
end
```

Now, whenever we do a `ctrl+p` with our cursor on a directory node, we'll get a file selector scoped to that directory.

![](/images/2023-08-20-nvim-ctrlp-screenshot.png)

