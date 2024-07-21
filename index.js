const {
  imageMiddleware,
  imageReducer,
  imageTermProps,
  mapTermsStateToImageProps,
} = require("./image-handler");
const addHighlights = require("./regex-highlighter");
const { WebLinksAddon, openLink, pasteText } = require("./WebLinksAddon");
const { URL_REGEX, COMMAND_REGEX } = require("./constants");

const KEY_CODE_BACKSPACE = 8;

// XXX: Hack to use our own WebLinksAddon, not the one preloaded from Hyper.
function removeOldAddons(term) {
  console.log("Current addons", term._addonManager._addons);
  term._addonManager._addons.forEach((addon) => {
    if (addon?.instance?._useLinkProvider !== undefined) {
      console.log("Removing old WebLinksAddon instance", addon);
      addon.instance.dispose();
    }
  });
  console.log("Updated addons", term._addonManager._addons);
}

exports.decorateTerm = (Term, { React, notify }) => {
  console.log("Decorating term", Term);

  return class extends React.Component {
    constructor(props, context) {
      super(props, context);
      this._term = null;
      this.onDecorated = this.onDecorated.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.setImageView = this.setImageView.bind(this);
    }

    componentDidUpdate(prevProps) {
      if (prevProps.imageViewState !== this.props.imageViewState) {
        const { url } = this.props.imageViewState || {};
        this.setImageView(url);
      }
    }

    componentWillUnmount() {
      if (this._term) {
        this._term.termRef.removeEventListener(
          "keyup",
          this.handleKeyUp,
          false
        );
        if (this._term.term) {
          this._term.term.offRender(() => addHighlights(this._term.term));
        }
      }
    }

    onDecorated(term) {
      console.log("Custom onDecorated for terminal", term);
      if (term === null) {
        return;
      }
      if (this.props.onDecorated) {
        this.props.onDecorated(term);
      }
      this._term = term;

      removeOldAddons(this._term.term);

      // Load custom addons.
      const commandPastePaddon = new WebLinksAddon(pasteText, {
        urlRegex: COMMAND_REGEX,
      });
      this._term.term.loadAddon(commandPastePaddon);
      console.log("Loaded commandPastePaddon", commandPastePaddon);

      const webLinksAddon = new WebLinksAddon(openLink, {
        urlRegex: URL_REGEX,
      });
      this._term.term.loadAddon(webLinksAddon);
      console.log("Loaded webLinksAddon", webLinksAddon);

      // Key listener.
      this._term.termRef.addEventListener("keyup", this.handleKeyUp, false);

      // Add highlights based on regexes, now and after changes to terminal content.
      // TODO: Do we still want this or do it all with WebLinksAddon?
      // addHighlights(this._term.term);
      // this._term.term.onRender(() => addHighlights(this._term.term));
    }

    handleKeyUp(event) {
      // Hide image on keypress.
      const { keyCode } = event;
      if (keyCode === KEY_CODE_BACKSPACE) {
        this.setImageView(null);
      }
    }

    createImageView() {
      if (!this.imageView) {
        this.imageView = React.createElement("img", {
          style: {
            position: "absolute",
            top: 0,
            right: 0,
            height: "auto",
            maxWidth: "35%",
            maxHeight: "35%",
            display: "none",
            // Fade in/out effect:
            opacity: 0,
            transition: "opacity 0.4s ease-in-out",
          },
          src: null,
          id: "image-view",
        });
      }
      return this.imageView;
    }

    setImageView(imageUrl) {
      let imageView = document.getElementById("image-view");
      if (!imageView) {
        return;
      }
      if (imageUrl) {
        imageView.style.display = "block";
        setTimeout(() => {
          imageView.style.opacity = 1; // Fade in
        }, 0);
        imageView.src = imageUrl;
      } else {
        imageView.style.opacity = 0;
        setTimeout(() => {
          imageView.style.display = "none";
        }, 400); // Match the duration of the opacity transition.
      }
    }

    render() {
      console.log("Rendering term", this.props);

      return React.createElement(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
          },
        },
        [
          React.createElement(
            Term,
            Object.assign({}, this.props, {
              onDecorated: this.onDecorated,
            })
          ),
          this.createImageView(),
        ]
      );
    }
  };
};

exports.middleware = imageMiddleware;
exports.reduceUI = imageReducer;
exports.mapTermsState = mapTermsStateToImageProps;
exports.getTermGroupProps = imageTermProps;
exports.getTermProps = imageTermProps;

console.log("hyper-easy loaded");
