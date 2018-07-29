# bia.js

`bia.js` is designed to be a very lightweight, basic single page application framework. It it built solely on javascript with only one dependency and only supports the loading of CSS, JS and HTML. 

## Dependencies

bia.js is built using `jQuery` meaning you must have this already loaded before `bia.js` is loaded. While this increases the dependency size, this project assumes you will be using `jQuery` in your project anyway and provides assistance steps to make it familiar while providing some more complex functionality (see below under `jQuery Instances`).

## Sizes

| File                 | Description                                                  | Size    |
| -------------------- | ------------------------------------------------------------ | ------- |
| bia.js               | Unminified and fully documented                              | 38.4 kb |
| bia.min.js           | Minified and uglified                                        | 8.59 kb |
| bia.min.js (gzipped) | `bia.min.js` when being served on a server supporting gzipping of resources (testing using an express webserver using the `compress` middleware) | 3.0 kb  |

## Getting Started

When `bia.js` is included with a `<script>` tag, it defined an object in the window named `bia` which contains all the functions to interact with it.

When getting up an running in the most basic environment, you should only need to call `bia.load()` which will cause `bia` to search your document and begin loading.

### Resources

When loading, `bia` searches for `<bia-load>` tags and parses them to find resources that need to be included. These tags should contain a series of `<load>` elements which detail the individual files to load. 

``` html
<bia-load>
	<load type="[type]" target="[target]" src="[src]"></load>
    <load type="region" target="[target]" src="[src]" display="[display]"></load>
    <load type="script" target="[target]" src="[src]" dependencies="[ids]" id="[id]"></load>
</bia-load>
```

The general structure of a load statement is the type of resource being loaded (which should be one of `script`, `region` and `style`), the location of the file (this should be a url to access the file. This uses jQueries `$.get` function so any restrictions placed on requests by that function will be shared by this library, see the notes below for more information) and a target which identified the element that the given resource should target (this is explained more in the individual sections below). Some types of load statements have more parameters but they are covered in the sections below

#### Load: Script

Identified by `type="script"`. 

| Parameter    | Type   | Required | Description                                                  |
| ------------ | ------ | -------- | ------------------------------------------------------------ |
| type         | string | Yes      | Should be `script` and marks the resource as a script file   |
| target       | string | Yes      | Represents the scope of this script. This is used to construct a new `jQuery` instance which prefixes all selectors with the target meaning that it will only select elements within that region (see `jQuery Instances` for more info). This should be the same as the `target` of a `region` block ideally. It should not have a `#` prefix. |
| src          | string | Yes      | The location from which to load the script. See the notes for more info about how this is loaded |
| dependencies | string | No       | This lists the other script files that this script relies on. It should be a space delimited string with each element being an ID of a script. How IDs are generated automatically is detailed below. |
| id           | string | No       | This is an identifier for the script which is only used when trying to identify dependencies. If not specified, this is automatically generated by taking the file name (substring from the last slash, not including the slash) and removing the `.js` suffix (eg `/res/js/foo.js` has the ID of `foo` unless otherwise specified). |

##### Execution

When scripts are loaded, they are wrapped in a scope limiting function:

``` javascript
(function($){
    <code goes here>
})(bia.buildModifiedjQueryInstance([target]));
```

Which is then wrapped in a script block and injected into the script insertion target (see the configuration section for more info, this defaults to `body`).

This means that any variables created within the script will not be shared to other scripts unless they are explicitly inserted into the window scope (eg `window.foo = 'bar'`). 

##### Dependencies

When a script is loaded, a load request is created internally with a list of the dependencies and will form a promise based on the loading of all the dependencies. This, however, means that a script cannot depend on a script that has not yet had a request for loading. This shouldn't be a problem in the large majority of cases but, primarily, it means that a script cannot depend on a script that is loaded in another region that is loaded later. The only way to avoid this happening is changing when the script is loaded by placing it in the region loaded before that of the script it relies on. This has the unfortunate effect of cluttering up load statements and meaning that it may not be as logical as otherwise possible but at the moment this is the best solution.

#### Load: Style

Identified by `type="style"`.

| Parameter   | Type           | Required                                   | Description                                                  |
| ----------- | -------------- | ------------------------------------------ | ------------------------------------------------------------ |
| type        | string         | Yes                                        | Should be `style`                                            |
| target      | string         | Partially (see precompiled for conditions) | The element that this script applies to. This is used to limit the scope of the css file so must reference a valid element or the css will not be applied. Usually this will be set equal to the 'target' value of a region to which the css should be applied. It should not begin with the `#` symbol. |
| src         | string         | Yes                                        | The location from which to load the style                    |
| precompiled | string/boolean | No                                         | This should be a boolean value wrapped in a string (because its HTML). Defaults to 'false'. If this is true, it indicates that the file has manually been limited to the target (this also means that the target value is ignored and may be omitted). Therefore no processing will take place on the file and it will be inserted as is. This is designed to be used in cases where the standard processing breaks the file (see preprocessing below) and you need to do it manually. |

##### Preprocessing

Before the style is inserted, it is processed to limit its effect. This is done by prefixing every selector in the file with another select in the format `#[target] ` which has the effect of limiting it down to the target that it was specified. This is done by finding each instance of the `}` symbol in the file and then skipping through each whitespace character until the first real character is reached. At this point the selector will be injected and it will move on to the next one. While this has worked for me in testing with all of my CSS (including autogenerated CSS from SASS), it cannot be guaranteed in all cases to work correctly. 

If the preprocessing seems to be breaking your CSS styles, you can try applying the limiting yourself (eg wrapping it in the selector and compiling with SASS or just doing it manually) and setting the precompiled flag to true. If this seems to fix the problem then feel free to raise an issue (please include your CSS so I can test) and I'll be more than happy to look into it.

##### Insertion

The script (after being preprocessed if required) is wrapped in a `<style>` block and inserted into the style insertion target (see configuration) which defaults to `head`.

#### Region

Identified by `type="region"`. Regions are just another name for HTML files which are inserted into the DOM.

| Parameter | Type   | Required | Description                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------ |
| type      | string | Yes      | Should be `"region"`                                         |
| target    | string | Yes      | The ID of the div that it should be placed in (see details below). This will be used as the target for script and style loads |
| src       | string | Yes      | The location from which to load the region                   |
| display   | string | No       | The CSS display to use when the DIV is faded in. This is the div that wraps the content, not the elements directly in the file. This just defaults to `block` |

##### Loading

When the file is loaded, it is wrapped in a div in the following style

```html
<div data-bia-region="true" data-bia-display="[display]" style="display: none;">
    [region here]
</div>
```

This is then appended to the region insertion target (see configuration) which defaults to `body`. If you do not specify a `display` value then it will default to block in the statement above. When the regions are swapped, the containing region shown above is faded in and out which will contain the content in the region file.

### Configuration

The base configuration is shown below. This holds the values that are used throughout the loading process and primarily changes how things are inserted into the document.

``` javascript
let configuration = {
        insertion: {
            script: 'body',
            style: 'head',
            region: 'body',
        },
        dependencies: {
            missing: 'load',
            failed: 'load',
        },
        swap: function (target, speed) {
            events.emit('swap', target);
            return new Promise(function (oResolve, oReject) {
                ... removed for shortness ...
            });
        },
    };
```

#### Insertion

These dictate where each of the load types will be inserted into the document. They are parsed as jQuery selectors. If you have a custom area that you want them inserted, you just need to update these values (see below) before the loading takes place.

#### Dependencies

These dictate how `bia` should act when javascript files depend on other scripts that have issues. The two options are shown below

| Option | Meaning                                                      |
| ------ | ------------------------------------------------------------ |
| `load` | The script will be loaded anyway even without the dependency. You should only use this if you know that the script will work correctly without as it may cause some issues. |
| `skip` | The script will be skipped and not loaded at all.            |

The value of `missing` is used when the dependency cannot be found (this most commonly happens when the load statement for the dependency has not been found by the time this one is called) and `failed` is used when there is an error loading or inserting the script data.

#### Swap

This is the function that is executed when a swap takes place. By default this will fade out every other component with a `data-bia-region` attribute and once every one has completed, it will fade in the component with the target specified. The speed parameter is optional and defaults to `300` (the default jQuery value is `400`). 

#### Configuring Values

The method `configure` is exposed via the `bia` object in the window scope meaning to change a configuration value:

``` javascript
bia.configure([key], [value]);
```

So to edit the insertion target for regions to be inserted into the div with id `main-content` you would call

``` javascript
bia.configure('insertion.region', '#main-content');
```

Remember the `#` when specifying IDs as these values are parsed as jQuery selectors.

### Events

The library exposes the `events` object as part of the `bia` object (`bia.events`) which functions similar to the `EventEmitter` module in Node.JS. To listen for an event you call `bia.events.on('[event]', [callback])` and to listen for an event only once you call `bia.events.once('[event]', [callback])` (once the event has been fired, the listener is removed). The events that are emitted are shown below:

| Event     | Data           | When                                                         |
| --------- | -------------- | ------------------------------------------------------------ |
| `begin`   | none           | Called when the `bia.load()` statement is called and loading begins |
| `success` | none           | Called if the loading completes with no failures detected during the process. This does not guarantee that there are no issues but it means that no errors were thrown during loading. |
| `partial` | none           | Called if the loading completes but some scripts failed to load properly. |
| `fail`    | none           | Called if the loading completed and no scripts loaded properly |
| `done`    | none           | Called when loading completes, no matter what happens        |
| `swap`    | target: string | Called when the view is swapped to another with the target being the target that was originally passed to the function. |

### Loading

Once you have added your `bia-load` sections, changed any configuration values you need and set up your listeners, you then just need to start loading.

``` javascript
bia.load();
```

### Changing Views

It's likely that once your page is up and running that you'll want to switch between the regions that you've loaded. To do this use the `bia.swap` function.

``` javascript
bia.swap('#[target]', [speed]);
```

For example, to swap to a region loaded with `target="news"` and the default speed you would call

``` javascript
bia.swap('#news');
```

and to do the same but at speed `100` you would do

``` javascript
bia.swap('#news', 100);
```

## Common Issues

### `Something is wrong and there is no output in the console`

`bia` does provide logging messages but they are out at the `debug` level of the console. By default (at least in Chrome), this is not shown. To enable it you need to open the console and find where it has a drop down which usually displays `Default Levels` next to `Filter`. It you open the menu and change it and tick `Verbose` you should see the bia output.

# Future Plans

- [ ] Implement the [History WebAPI](https://developer.mozilla.org/en-US/docs/Web/API/History) to allow for more natural navigation
- [ ] Implement some form of automated testing

# Contributions

On the off-chance someone sees this and decides to help out, contributions are more than welcome. Only requirement is that your code has at least some comments (JSDoc is required on functions but can be omitted on variables provided they have descriptive names). Send a pull request with any changes and I'll review them as quickly as possible

# Issues

Use the GitHub issues pages to report and issues with the project. You should include what the error is, any output in the console (with Verbose logging enabled) and if it relates specifically to one file such as a failing CSS file that should work correctly, try to include it or at least a proof of concept file that demonstrates the issue in the same way.