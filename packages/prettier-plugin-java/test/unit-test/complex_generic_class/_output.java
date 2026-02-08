public class GenericClass {
  private BEAN bean;

  public GenericClass(BEAN bean) {
    this.bean = bean;
  }

  public BEAN setBean(BEAN bean) {
    this.bean = bean;
    return bean;
  }

  public T doSomething(T t) {
    return t;
  }

  public void addAll(final Collection<?> c) {
    for (final E e : c) {
      add(e);
    }
  }
}

public abstract class AbstractGenericClass {
  public Value getValue() {
    return new Value();
  }
}
