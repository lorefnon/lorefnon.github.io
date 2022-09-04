---
title: Setting up logrotation for zerolog
tags: [go, golang, zerolog]
date: 2022-09-01
---

Zerolog is a popular structured logging library for go. This post is a quick recipie for configuring it to use log rotation. 

Log rotation is a mechanism where instead of having a single log file which keeps growing forever, the application switches to a new log file when a time threshold or a size threshold is exceeded. Optionally files which are too old to be of significance can be deleted.

While logging to a stream and having an external service manage it for your is nice if you can embrace it. However, Log rotation can be useful for desktop applications or isolated deployments.

Lumberjack is a nice utility for go that supports log rotation. It is also easy to hook up with zerolog because a lumberjack logger implements io.Writer which zerolog can target.

{% hlcode lang:go %}

/** Configuration options for log rotation */
type LoggerConfig struct {
	/** Max size of the logfile before it's rolled */
	MaxSizeMB int `json:"max_size_mb,omitempty"`
	/** Max number of rolled files to keep */
	MaxBackupCount int `json:"max_backup_count,omitempty"`
	/** Max age in days to keep a logfile */
	MaxAgeDays int `json:"max_age_days,omitempty"`
}

func initLogger(config *config.LoggerConfig) *zerolog.Logger {
	var writers []io.Writer
	// Optional: Log to console
	writers = append(writers, zerolog.ConsoleWriter{Out: os.Stderr})
	// Log to rolling file
	writers = append(writers, initRollingFileLogger(config))

	// Multiwriter encapsulates multiple writers
	mw := io.MultiWriter(writers...)

	logger := zerolog.New(mw).With().
		Timestamp().
		Logger()

	return &logger
}

func initRollingFileLogger(config *config.LoggerConfig) *lumberjack.Logger {
	loggerPath := filepath.Join(xdg.DataHome, "example", "app.log")
	fmt.Printf("logging to file: %s\n", loggerPath)
	return &lumberjack.Logger{
		Filename:   loggerPath,
		MaxBackups: config.MaxBackupCount,
		MaxSize:    config.MaxSizeMB,
		MaxAge:     config.MaxAgeDays,
	}
}
{% endhlcode %}

We can now use the logger returned by initLogger to write logs, and they will be written to a file which will be rotated by lumberjack.
