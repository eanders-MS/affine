namespace affine.Screen {
    export const SCREEN_WIDTH = screen.width;
    export const SCREEN_HEIGHT = screen.height;
    export const SCREEN_HALF_WIDTH = Screen.SCREEN_WIDTH >> 1;
    export const SCREEN_HALF_HEIGHT = Screen.SCREEN_HEIGHT >> 1;
    export const SCREEN_HALF_SIZE = Vec2.N(Screen.SCREEN_HALF_WIDTH, Screen.SCREEN_HALF_HEIGHT);
    export const SCREEN_LEFT = -Screen.SCREEN_HALF_WIDTH;
    export const SCREEN_RIGHT = Screen.SCREEN_HALF_WIDTH;
    export const SCREEN_TOP = -Screen.SCREEN_HALF_HEIGHT;
    export const SCREEN_BOTTOM = Screen.SCREEN_HALF_HEIGHT;
    export const SCREEN_LEFT_FX8 = Fx8(Screen.SCREEN_LEFT);
    export const SCREEN_RIGHT_FX8 = Fx8(Screen.SCREEN_RIGHT);
    export const SCREEN_TOP_FX8 = Fx8(Screen.SCREEN_TOP);
    export const SCREEN_BOTTOM_FX8 = Fx8(Screen.SCREEN_BOTTOM);
    export const SCREEN_WIDTH_FX8 = Fx8(Screen.SCREEN_WIDTH);
    export const SCREEN_HEIGHT_FX8 = Fx8(Screen.SCREEN_HEIGHT);
    export const SCREEN_HALF_WIDTH_FX8 = Fx8(Screen.SCREEN_HALF_WIDTH);
    export const SCREEN_HALF_HEIGHT_FX8 = Fx8(Screen.SCREEN_HALF_HEIGHT);
}