---
title: Embedding sql migrations in go binary
tags: [go, go-migrate, sql]
date: 2022-10-01
---

[Go-migrate](github.com/golang-migrate/migrate) is a simple and easy to use database migration (schema evolution) library for go with good support for many mainstream databases. This post is a quick recipe on how we can bundle the migrations (sql patch files) within our go binary - this is particularly helpful when the app is distributed a single binary without dependencies.

Go stdlib includes an [embed package](https://pkg.go.dev/embed) that simplifies accessing files embedded in the running go program. Also go-migrate has support for httpfs as a source that makes it easy to integrate the two.

{% hlcode lang:go %}
package store

import (
	"database/sql"
	"embed"
	"net/http"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/httpfs"
	_ "github.com/mattn/go-sqlite3"
)

// Our migration files reside in db_migrations directory within this package
// eg. db_migrations/
//     |_ 001_create_tables.up.sql
//     |_ 001_create_tables.down.sql

//go:embed db_migrations
var migrations embed.FS

func migrateSchema() error {
    db, err := sql.Open("sqlite3", dbFilePath)
    if err != nil { return err }
    driver, err := sqlite3.WithInstance(db, new(sqlite3.Config))
    if err != nil { return err }
    sourceInstance, err := httpfs.New(http.FS(migrations), "db_migrations")    
    if err != nil { return err }
    migrator, err := migrate.NewWithInstance("httpfs", sourceInstance, "sqlite3", driver) 
    if err != nil { return err }
    err = migrator.Up()
    return err
}
{% endhlcode %}

