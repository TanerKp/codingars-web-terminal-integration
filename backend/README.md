# Coding ARS Backend

Data endpoint for programming tasks related to the Coding ARS. Allows obtaining tasks (managed in collections), executing task related source code via code runners and persisting solutions for later comparison as well as rating.

Provides an HTTP interface for creating programming tasks grouped into collections using Git repositories (currently from GitHub) and using them in a session (e.g. a course, event, or other user grouping). The service offers the possibility to query the information about tasks, run results as well as to compare different solutions within a session.

## Usage

There is a database required, start `docker-compose up mongodb -d` to create on. After this, start service with `npm start`.

You can bypass any other database with something like `DATABASE="mongodb://localhost/lti" npm start`

Show debugging messages by setting `DEBUG` environmental variable to something like `coding:*`, e. g.: `DEBUG=coding:* npm start` or simply run `npm run debug`. Attach to inspector by using Chrome and open `chrome://inspect`.

## Task Repository Setup

Tasks are managed in collections and those are provided in some kind of storage. Currently, it is possible to attach HTTP-bases as well as Git repositories as sources for tasks. Typical task collections should have a structure like this:

```
+- /
    |
    +- task1/
    |   |
    |   +- task.yaml
    |   |
    |   +- Main.java
    |
    +- task2/
    |   |
    |   +- task.yaml
    |   |
    |   +- Main.java
    |
    +- collection.yaml
```

In case of Git repositories: It is possible to place collections into subdirectories, thus, manage multiple collection in one repository. Anyway, its not advisable. Collections has to be checked out and the more traffic is required to get this repo, the more time has to be consumed to setup sessions.

### Example of collection.yaml

The `collection.yaml` holds basic information for all tasks, e. g., an overall title and description as well as a mandatory list of included tasks.

```
title: Example Collection
description: Learn something!
tasks:
  - task1
  - task2
```

### Example of task.yaml

The `task.yaml` describes all required informations which are related to tasks. This also includes information regarding the execution.

```
title: "Test"
description: "Hello, World!"
mainClass: Main
maxTimeInMs: 2000
runWith: java
files:
  - Main.java
```

## API

### Workflow

It is necessary to initially create a session and then report the resulting session key (usually six digits) to a client. The client then uses the join call (`/join/<key>`) to join the session, thereby obtaining a reference to the task collection and can then use calls to query information (`/collection/<ref>` and `/task/<ref>/<task>`) or realize an execution of source code (`/run/<ref>/<task>`).

### Create Session (Git)

Call (GET) `http://localhost:4000/github/thi-coding-ars/example-tasks.git` to create new session from repository. This is the initial step made by content providers, e. g., lectures. The resulting session key `cd1fd4` (example) has to be used to work with this collection of tasks.

This will create something like this:

```json
{
    "session": "cd1fd4",
    "collection": "6020591cff2d3b26dfde154e"
}
```

Keep the collection identifier (e. g., `6020591cff2d3b26dfde154e`) as a management reference at a save location. You can use this to manage related sessions as well as the collection itself.

_Query Parameters:_

- `key` github access key for repositories (optional, only for private repos)
- `run` should be a configurated runner (optional, can also provided with `runWith` in `collection.yaml` or `task.yaml`)
- `base` can be used to map to any subfolder in repository (optional, root of repo used if not provided)
- `commit` in order to request a specific commit hash, add this (optional, HEAD is used if not provided)

### Create Session (HTTP)

Call (POST) `http://localhost:4000/http/` to create new sessions for HTTP-Endpoints. This is the initial step made by content providers, e. g., lectures. The resulting session key `cd1fd4` (example) has to be used to work with this collection of tasks. Request body schould contain a URL as well as required credentials (optional):

```json
{
    "url": "https://raw.githubusercontent.com/thi-cs-slides/example-tasks/main/",
    "username": "someuser",
    "password": "somepass"
}
```

This will create something like this:

```json
{
    "session": "cd1fd4",
    "collection": "6020591cff2d3b26dfde154e"
}
```


### Join Session

Each coding environment (or enduser) should initial join a session by calling (GET): `http://localhost:4000/join/cd1fd4`. The response contains a reference pointing to the collection.

```json
{
    "id": "29757bf8-fec0-473e-88f9-34fe6f448505"
}
```

### Gather Collection Information

Tasks are grouped by collections of tasks, also single tasks. Thus, after joining call for (GET): `http://localhost:4000/collection/29757bf8-fec0-473e-88f9-34fe6f448505` to get basic collection data. In case of single tasks, this details does not contain any further title or description. Anyway, the response contains an array with `tasks` and descriptions for each task.

``` json
{
    "title": "Example Collection",
    "description": "Learn something!",
    "tasks": [
        {
            "title": "Test",
            "description": "Hello, World!"
        }
    ],
}
```

_Advice: in case of collections with only one task, directly show the task, instead a preselection_

### Gather Task Details

Per task, ask for task details by calling (GET): `http://localhost:4000/task/29757bf8-fec0-473e-88f9-34fe6f448505/0` or `http://localhost:4000/task/29757bf8-fec0-473e-88f9-34fe6f448505/task1`, e. g., for requesting task by number 0 of the task array or path `task1` in this collection. The response will be something like:

``` json
{
    "title": "Test",
    "description": "Hello, World!",
    "files": [
        {
            "path": "Main.java",
            "content": "public class Main { public static void main(String[] args) { } } "
        }
    ],
}
```

This information should be displayed properly, e. g., as task description in combination with some editor. Additionally, in case of collections with one task, it is ok to just call `http://localhost:4000/task/29757bf8-fec0-473e-88f9-34fe6f448505`.

### Call Runner

In order to run user content, call (POST): `http://localhost:4000/run/29757bf8-fec0-473e-88f9-34fe6f448505/0` or `http://localhost:4000/run/29757bf8-fec0-473e-88f9-34fe6f448505/task1` a body like this:

```json
{
    "sources": [
        {
            "path": "Main.java", 
            "content": "public class Main { public static void main(String[] args) { System.out.println(\"Hello, World\"); } }"
        }
    ]
}
```

The backend will merge this with other files and replace repository files with user content (fully). This will result in something like this:

```json
{
    "compileResults": [],
    "runOutput": "Hello, World\n",
    "message": ""
}
```

Furthermore, in case of collections with one task, it is ok to just call (POST) `http://localhost:4000/run/29757bf8-fec0-473e-88f9-34fe6f448505`.

### Management

#### Change Collection to Commit Hash

Call (GET) `http://localhost:4000/git/6020591cff2d3b26dfde154e/commit/5932e3d3141d499474428149695241e7661bec06` to update the git based collection `6020591cff2d3b26dfde154e` to commit hash `5932e3d3141d499474428149695241e7661bec06`. This collection id is received when creating the collection from github repositories. Response will be HTTP Status 204 if everything is fine.

#### Create Another Session from Existing Collection

Call (GET) `http://localhost:4000/collection/6020591cff2d3b26dfde154e/create-session` to create another session. This will reuse an existing collection (and its commit hash pointer) and create a new session identifier. The result will be something like:

```json
{
    "session": "bc4fa8"
}
```

## Run Tests

Use `npm run test` to run test, this will also need a MongoDB and Code-Runner instances. Thus, start the DB by calling `docker-compose up -d` previously.

## ENV

- `CACHE_TIME`: Time to cache in seconds entries, default is 3600
- `WORKDIR_TIME`: Time to cache in seconds work dirs, default is 604.800 (one week)
- `PORT`: Port for accessing service, default is 4000
- `WORKDIR_PATH`: Maps to local workdir folder, default is `workdirs`
- `SESSION_KEY_LENGTH`: Number of characters in session keys, default is 6
- `DATABASE`: MongoDB URL, default is `mongodb://localhost/codingars`
- `DISABLE_FILE_CACHE`: Disable caching of files in this setup, default is false

## Model

- Collection: Collection configuration, contains repository and credentials as well as assigned runner
- Session: Maps to collection
- Solution: Maps to tasks and provides user solutions, allows to vote (TODO)

## ToDo

- Attach user identifier and callbacks to service providers