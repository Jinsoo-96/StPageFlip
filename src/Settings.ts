/**
 * Book size calculation type
 */
export enum SizeType {
    /** Dimensions are fixed */
    FIXED = 'fixed',
    /** Dimensions are calculated based on the parent element */
    STRETCH = 'stretch',
}

/**
 * Configuration object
 */
export interface FlipSetting {
    /** Page number from which to start viewing */
    startPage: number;
    /** Whether the book will be stretched under the parent element or not */
    size: SizeType;

    width: number;
    height: number;

    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;

    /** Draw shadows or not when page flipping */
    drawShadow: boolean;
    /** Flipping animation time */
    flippingTime: number;

    /** Enable switching to portrait mode */
    usePortrait: boolean;
    /** Initial value to z-index */
    startZIndex: number;
    /** If this value is true, the parent element will be equal to the size of the book */
    autoSize: boolean;
    /** Shadow intensity (1: max intensity, 0: hidden shadows) */
    maxShadowOpacity: number;

    /** If this value is true, the first and the last pages will be marked as hard and will be shown in single page mode */
    showCover: boolean;
    /** Disable content scrolling when touching a book on mobile devices */
    mobileScrollSupport: boolean;

    /** Set the forward event of clicking on child elements (buttons, links) */
    clickEventForward: boolean;

    /** Using mouse and touch events to page flipping */
    useMouseEvents: boolean;

    swipeDistance: number;

    /** if this value is true, fold the corners of the book when the mouse pointer is over them. */
    showPageCorners: boolean;

    /** if this value is true, flipping by clicking on the whole book will be locked. Only on corners */
    disableFlipByClick: boolean;

    /** 코너 호버 민감도 변수 : 디폴트 = 5 더 민감하게 숫자를 더 작게, 덜 민감하게 숫자를 더 크게 */
    cornerSensitivity: number;

    /** if this value is true, corner hover effect will be enabled for hard pages */
    hardPageHover: boolean;

    /** 스와이프 제외할 CSS 선택자 배열 ['.abc', '.adf']*/
    swipeExcludeSelectors: string[]; // 스와이프 제외할 CSS 선택자 배열
}

export class Settings {
    private _default: FlipSetting = {
        startPage: 0,
        size: SizeType.FIXED,
        width: 0,
        height: 0,
        minWidth: 0,
        maxWidth: 0,
        minHeight: 0,
        maxHeight: 0,
        drawShadow: true,
        flippingTime: 1000,
        usePortrait: true,
        startZIndex: 0,
        autoSize: true,
        maxShadowOpacity: 1,
        showCover: false,
        mobileScrollSupport: true,
        swipeDistance: 30,
        clickEventForward: true,
        useMouseEvents: true,
        showPageCorners: true,
        disableFlipByClick: false,
        cornerSensitivity: 5, // Default sensitivity for corner hover
        hardPageHover: true, // Default: Enable corner hover for hard pages
        swipeExcludeSelectors: [], // Default empty array for swipe exclusion selectors
    };

    /**
     * Processing parameters received from the user. Substitution default values
     *
     * @param userSetting
     * @returns {FlipSetting} Сonfiguration object
     */
    public getSettings(userSetting: Partial<FlipSetting>): FlipSetting {
        // 🎯 Record<string, number | string | boolean> → Partial<FlipSetting>으로 변경
        const result = { ...this._default }; // 🎯 spread operator로 복사
        Object.assign(result, userSetting);

        if (result.size !== SizeType.STRETCH && result.size !== SizeType.FIXED)
            throw new Error('Invalid size type. Available only "fixed" and "stretch" value');

        if (result.width <= 0 || result.height <= 0) throw new Error('Invalid width or height');

        if (result.flippingTime <= 0) throw new Error('Invalid flipping time');

        if (result.size === SizeType.STRETCH) {
            if (result.minWidth <= 0) result.minWidth = 100;

            if (result.maxWidth < result.minWidth) result.maxWidth = 2000;

            if (result.minHeight <= 0) result.minHeight = 100;

            if (result.maxHeight < result.minHeight) result.maxHeight = 2000;
        } else {
            result.minWidth = result.width;
            result.maxWidth = result.width;
            result.minHeight = result.height;
            result.maxHeight = result.height;
        }

        return result;
    }
}
