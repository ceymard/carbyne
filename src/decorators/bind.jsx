
export function Bind(observable, opts) {

  if (!observable) return;

  return function () {
    return new BindController(observable);
  };


}

export class BindController extends Controller {

  constructor(obs) {
    super();
    this.obs = obs;
  }

  link() {

  }

}
