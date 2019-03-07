# Specification of captive portal format

- YAML-based
- code-free

## Fields

- `name String`: Name of portal-solver displayed to user
- `desc String`: Desc of portal-solver displayed to user
- `options Object`: Various options that are required for the solver, such as usernames and passwords
	- `$name Object`: Later gets exposed as `$name` whatever is choosen as key
		- `type String`: The type of the field. Can be `string`, `number`, `boolean`
		- `name String`: Name of field as displayed to user in settings
		- `desc String`: Desc of field as displayed to user in settings

- `solution Object`: Solving instructions
	- `$block-name`: The block name. First block must be `main`
		- `match`: When the block is executed
			- `$field.is`: Boolean match field
			- `$field.matches`: Regex match field
			- `$field.equals`: String or integer match field
			- fields:
				- `url`: The requested URL
				- `query`: The query parameters
				- `header.$name`: A header, such as `header.location`
				- `redirect`: A flag whether or not the request redirects
				- `status`: The status code
				- `method`: The method used to make the request
				- `config.$name`: Configuration object with key
		- `respond`: What to respond. All fields allow for usage of variables described in `match` using `${VARIABLENAME}`
			- `url String`: The URL to request
			- `method String`: The method which to use (default `GET`)
			- `setCookie String[]->String`: Cookies to set (previous ones are kept)
			- `clearCookie String[]`: Cookies to clear
			- `formdata String[]->String`: Formdata for a POST request
			- `header String[]->String`: Headers to set
		- `action`: Alternative to respond. Specify an action. Possible: `failure` (general failure), `invalidCredentials` (inform user credentials are invalid), `success` (captive has been successfully solved), `continueMatch` (go to another codeblock based on match)
		- `continueTo`: Code block to continue to. If not set will be matched by another codeblock in the same solver

## Execution

First the CaptiveConnect client connects to `http://detectportal.firefox.com` and gets the response

It then loads the `main` block of every portal and matches against the parameters. The first portal in alphabetical order that matches will be picked
